import cron from 'node-cron';
import prisma from '../prisma';
import { getNetworkServiceForTenant } from '../networks/factory';
import type { NetworkCode } from '../networks/types';
import { GoogleAdsAdapter } from '../networks/google/GoogleAdsAdapter';
import { runDecisor } from './agentDecisor';
import { generateStrategicBriefing } from './strategicBriefing';
import { notifyWhatsApp, notifySlack, notifyDigest } from './agentNotificador';
import { inferLifecycleStatus } from './campaignStateMachine';
import { getProvisionedNetworkCodes } from './networkProvisioning';
// Achado real na verificação de deploy (2026-09-03): este ciclo interno (disparado pelo
// instrumentation.ts, roda dentro do próprio processo do Next.js) sempre fez só sync+decisor —
// o agente de negativação do Google (A6) e o motor de realocação cross-rede (T4,
// docs/PLANO_TIKTOK.md) só existiam na rota HTTP irmã (/api/cron/campanhas/sync/route.ts),
// que nenhum scheduler jamais chamava. Importados aqui pra completar o MESMO ciclo, não
// duplicar — nunca agendar os dois caminhos (interno + HTTP) juntos pro mesmo horário, senão
// syncMetrics/runDecisor rodam 2x e dobram chamada real às redes de anúncio.
import { runNegationAgent } from './googleNegationService';
import { runReallocationAgent } from './reallocationEngine';
// FASE 19.2/19.3 — circuit breaker extraído pra módulo compartilhado com o health-check
// dedicado (network-healthcheck/route.ts), pra nunca duplicar esta lógica em 2 lugares.
import {
  CIRCUIT_BREAKER_THRESHOLD,
  formatSyncFailureAlert,
  getCircuitState,
  getNetworkMaps,
  isCircuitOpen,
  recordCircuitFailure,
  resetCircuitBreaker,
} from './networkCircuitBreaker';

const SYNC_SCHEDULE = process.env.AGENT_SYNC_SCHEDULE || '0 */6 * * *';
const BRIEFING_MORNING_SCHEDULE = process.env.BRIEFING_MORNING_SCHEDULE || '0 8 * * *';
const BRIEFING_CLOSING_SCHEDULE = process.env.BRIEFING_CLOSING_SCHEDULE || '0 18 * * *';

function formatBriefingForWhatsApp(briefing: any): string {
  const content = briefing.content as any;
  const typeLabel = briefing.type === 'morning' ? 'BRIEFING MATINAL' : briefing.type === 'closing' ? 'FECHAMENTO DO DIA' : 'BRIEFING';
  const date = new Date(briefing.createdAt).toLocaleDateString('pt-BR');

  let msg = `*${typeLabel} — ${date}*\n\n`;

  if (content.urgentAlerts?.length > 0) {
    msg += `*ALERTAS URGENTES*\n`;
    for (const alert of content.urgentAlerts) {
      msg += `- ${alert}\n`;
    }
    msg += '\n';
  }

  if (content.performanceSummary) {
    msg += `*RESUMO*\n${content.performanceSummary}\n\n`;
  }

  if (content.campaignAnalysis?.length > 0) {
    msg += `*CAMPANHAS*\n`;
    for (const c of content.campaignAnalysis) {
      const icon = c.status === 'critical' ? '🔴' : c.status === 'warning' ? '🟡' : '🟢';
      msg += `${icon} *${c.campaignName}*: ${c.recommendation}\n`;
    }
    msg += '\n';
  }

  if (content.budgetRecommendations?.length > 0) {
    msg += `*BUDGET*\n`;
    for (const rec of content.budgetRecommendations) {
      msg += `- ${rec}\n`;
    }
    msg += '\n';
  }

  if (content.actionItems?.length > 0) {
    msg += `*ACOES*\n`;
    for (const item of content.actionItems) {
      msg += `- ${item}\n`;
    }
    msg += '\n';
  }

  if (content.tomorrowPlan) {
    msg += `*AMANHA*\n${content.tomorrowPlan}\n`;
  }

  if (msg.length > 4096) {
    msg = msg.slice(0, 4090) + '\n...';
  }

  return msg;
}

/** Retorna lista de tenantIds distintos que possuem campanhas ativas */
export async function getActiveTenants(): Promise<string[]> {
  const rows = await prisma.campaign.findMany({
    where: { tenantId: { not: null } },
    select: { tenantId: true },
    distinct: ['tenantId'],
  });
  return rows.map(r => r.tenantId!).filter(Boolean);
}

export function startAgentMonitor() {
  console.log(`Agent Monitor iniciado — ciclo: ${SYNC_SCHEDULE}`);
  console.log(`Briefing matinal: ${BRIEFING_MORNING_SCHEDULE}`);
  console.log(`Briefing fechamento: ${BRIEFING_CLOSING_SCHEDULE}`);

  cron.schedule(SYNC_SCHEDULE, async () => {
    console.log('Agent Monitor: iniciando ciclo...');
    try {
      await syncMetrics(); // já itera internamente por tenant
      // Rodar decisor para cada tenant que tem campanhas
      const tenants = await getActiveTenants();
      await Promise.allSettled(tenants.map(tid => runDecisor(tid)));
      // A6 — agente de negativação do Google (só age em tenants com campanhas Google)
      await Promise.allSettled(tenants.map(tid => runNegationAgent(tid)));
      // T4 — motor de realocação cross-rede; mensagem própria (não mesclada com o digest de
      // runDecisor, que já notifica sozinho) — mesmo desenho já usado em campanhas/sync/route.ts
      await Promise.allSettled(tenants.map(async tid => {
        const { digestItems } = await runReallocationAgent(tid);
        if (digestItems.length > 0) await notifyDigest(tid, digestItems).catch(() => {});
      }));
      console.log('Agent Monitor: ciclo concluido');
    } catch (err) {
      console.error('Agent Monitor erro:', err);
    }
  });

  cron.schedule(BRIEFING_MORNING_SCHEDULE, async () => {
    console.log('Briefing matinal: gerando...');
    try {
      const tenants = await getActiveTenants();
      for (const tenantId of tenants) {
        const briefing = await generateStrategicBriefing('morning', tenantId);
        const message = formatBriefingForWhatsApp(briefing);
        await Promise.allSettled([
          notifyWhatsApp(message, tenantId),
          notifySlack(message),
        ]);
      }
      console.log('Briefing matinal enviado');
    } catch (err) {
      console.error('Briefing matinal erro:', err);
    }
  });

  cron.schedule(BRIEFING_CLOSING_SCHEDULE, async () => {
    console.log('Briefing fechamento: gerando...');
    try {
      const tenants = await getActiveTenants();
      for (const tenantId of tenants) {
        const briefing = await generateStrategicBriefing('closing', tenantId);
        const message = formatBriefingForWhatsApp(briefing);
        await Promise.allSettled([
          notifyWhatsApp(message, tenantId),
          notifySlack(message),
        ]);
      }
      console.log('Briefing fechamento enviado');
    } catch (err) {
      console.error('Briefing fechamento erro:', err);
    }
  });
}

export async function syncMetrics() {
  const campaigns = await prisma.campaign.findMany({
    where: {
      OR: [
        { metaCampaignId: { not: null } },
        { AND: [{ networkId: { not: null } }, { externalId: { not: null } }] },
      ],
    },
    select: { id: true, tenantId: true, metaCampaignId: true, externalId: true, networkId: true },
  });

  // Resolve networkId ↔ code (public.ad_networks) — FASE 19.2 precisa do mapa code→id pra
  // ler/escrever o disjuntor de circuit breaker mesmo pra rede sem campanha nenhuma ainda
  // nesta rodada. Extraído pra networkCircuitBreaker.ts (compartilhado com o health-check).
  const { codeById: networkCodeById, idByCode: networkIdByCode } = await getNetworkMaps();

  const byTenant = new Map<string, typeof campaigns>();
  for (const c of campaigns) {
    const key = c.tenantId ?? '__global__';
    if (!byTenant.has(key)) byTenant.set(key, []);
    byTenant.get(key)!.push(c);
  }

  const until = new Date().toISOString().slice(0, 10);
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  for (const [tenantId, tenantCampaigns] of Array.from(byTenant.entries())) {
    if (tenantId === '__global__') continue;

    // Coleta só pode acontecer pra rede que o tenant tem contratada agora — credencial ainda
    // ativa no banco não é suficiente (ex.: rede foi provisionada no passado, contrato
    // encerrado, ninguém apagou a credencial). Calculado 1x por tenant, não por campanha.
    const provisionedNetworks = await getProvisionedNetworkCodes(tenantId);

    // FASE 19.2 — estado do disjuntor por rede, lido 1x por tenant (não por campanha).
    const circuitState = await getCircuitState(tenantId);

    // FASE 19.1 — última mensagem de erro por rede nesta rodada, só pro texto do alerta (o
    // disparo em si agora é decidido pelo circuit breaker — ver justTrippedNetworks abaixo).
    const lastErrorByNetwork = new Map<string, string>();
    const justTrippedNetworks = new Set<string>();

    for (const campaign of tenantCampaigns) {
      // networkId ausente = campanha legada anterior ao FK (sempre Meta, via metaCampaignId)
      const networkCode = ((campaign.networkId ? networkCodeById.get(campaign.networkId) : null) || 'meta') as NetworkCode;
      const externalId = networkCode === 'meta' ? (campaign.metaCampaignId || campaign.externalId) : campaign.externalId;

      if (!externalId) continue;
      if (!provisionedNetworks.has(networkCode)) continue;

      // FASE 19.2 — disjuntor aberto: pula esta campanha, a menos que o cooldown já tenha
      // passado (half-open — sempre dá uma chance nova depois de um tempo; a 19.3/canário
      // roda de hora em hora e reforça isso independente de haver campanha pra sincronizar).
      if (isCircuitOpen(circuitState.get(networkCode))) {
        console.warn(`[syncMetrics] Disjuntor aberto pra ${networkCode} (tenant ${tenantId}) — pulando`);
        continue;
      }

      let networkService: Awaited<ReturnType<typeof getNetworkServiceForTenant>>;
      try {
        networkService = await getNetworkServiceForTenant(tenantId, networkCode);
      } catch (e) {
        console.warn(`[syncMetrics] Configuração da rede ${networkCode} ausente para o tenant ${tenantId}`);
        continue;
      }

      try {
        await syncCampaignInsights(networkService, campaign, externalId, since, until);
        await resetCircuitBreaker(tenantId, networkCode, networkIdByCode, circuitState);
      } catch (err) {
        console.error(`Erro ao sincronizar campanha ${campaign.id} (${networkCode}):`, err);
        lastErrorByNetwork.set(networkCode, err instanceof Error ? err.message : String(err));
        const tripped = await recordCircuitFailure(tenantId, networkCode, networkIdByCode, circuitState);
        if (tripped) justTrippedNetworks.add(networkCode);
      }

      // FASE 1 (Google Ads) A4 — coletor de Search Terms (só Google; sustenta a negativação
      // automática, ver docs/PLANO_GOOGLE_TIKTOK.md A6). Falha isolada, não afeta o resto do sync.
      // Não alimenta o circuit breaker — o próprio adapter já trata "sem search_term_view" como
      // esperado/não-crítico (campanha Performance Max), não é sinal de API quebrada.
      if (networkCode === 'google' && networkService instanceof GoogleAdsAdapter) {
        try {
          await collectGoogleSearchTerms(networkService, campaign.id, campaign.tenantId, externalId, since, until);
        } catch (err) {
          console.error(`[collectGoogleSearchTerms] Erro na campanha ${campaign.id}:`, err);
        }
      }

      // FASE 4 — infere lifecycle após sync (falha silenciosa)
      try {
        await inferLifecycleStatus(campaign.id);
      } catch (err) {
        console.error(`[Lifecycle] Erro ao inferir status da campanha ${campaign.id}:`, err);
      }
    }

    // FASE 19.1/19.2 — dispara alerta só pra rede que o disjuntor ACABOU de abrir nesta
    // rodada — não a cada falha isolada (throttling de graça: depois de aberto, o disjuntor
    // já impede novas tentativas até o cooldown, então não faz sentido re-alertar toda rodada).
    if (justTrippedNetworks.size > 0) {
      await Promise.allSettled(
        Array.from(justTrippedNetworks).map(networkCode => {
          const lastError = lastErrorByNetwork.get(networkCode) || 'erro desconhecido';
          return notifyWhatsApp(formatSyncFailureAlert(networkCode, CIRCUIT_BREAKER_THRESHOLD, lastError), tenantId);
        }),
      );
    }
  }
}

/**
 * Sincroniza os Insight (campanha-dia) de UMA campanha contra a rede já resolvida — extraído
 * do loop de syncMetrics() pra ser reaproveitado também pelo sync manual (POST /insights/sync),
 * que antes desta sessão só cobria Meta e duplicava (parcialmente, defasado) este mesmo mapeamento
 * de campos. Fonte única evita o tipo de drift que causou aquela defasagem original.
 */
export async function syncCampaignInsights(
  networkService: Awaited<ReturnType<typeof getNetworkServiceForTenant>>,
  campaign: { id: string; tenantId: string | null },
  externalId: string,
  since: string,
  until: string,
): Promise<number> {
  const insights = await networkService.fetchInsights(externalId, { since, until });
  let count = 0;
  for (const day of insights) {
    const insightId = `${campaign.id}-${day.date}`;
    const insightBase = {
      impressions:      day.impressions,
      reach:            day.reach,
      clicks:           day.clicks,
      spend:            day.spend,
      cpc:              day.cpc,
      cpm:              day.cpm,
      ctr:              day.ctr,
      frequency:        day.frequency,
      // Achado real da auditoria "O Loop Quebrado do ICP" (2026-09-04): este campo nunca era
      // gravado aqui — `Insight.conversions` (a coluna real) ficava sempre em 0 pra QUALQUER
      // rede/segmento, apesar de `NetworkInsight.conversions` já vir certo dos 2 adapters. Só
      // não tinha sido notado porque os dados de teste desta sessão sempre vieram de seed SQL
      // (que grava a coluna direto), nunca de um sync real passando por aqui.
      conversions:      day.conversions ?? 0,
      // FASE 5 — Video Metrics
      videoViews3s:     day.videoViews3s     ?? 0,
      videoViews15s:    day.videoViews15s    ?? 0,
      videoViews25Pct:  day.videoViews25Pct  ?? 0,
      videoViews50Pct:  day.videoViews50Pct  ?? 0,
      videoViews75Pct:  day.videoViews75Pct  ?? 0,
      videoViews100Pct: day.videoViews100Pct ?? 0,
      thruplayViews:    day.thruplayViews    ?? 0,
      // FASE 8.5 — Sinais de diagnóstico do Meta
      qualityRanking:        day.qualityRanking        ?? null,
      engagementRateRanking: day.engagementRateRanking ?? null,
      conversionRateRanking: day.conversionRateRanking ?? null,
      firstImpressionRatio:  day.firstImpressionRatio  ?? null,
      breakdowns:       (day as any).breakdowns ?? {},
      // FASE 1 (Google Ads) — Impression Share + ROAS
      searchImpressionShare: day.searchImpressionShare ?? 0,
      searchBudgetLostIs:    day.searchBudgetLostIs    ?? 0,
      searchRankLostIs:      day.searchRankLostIs      ?? 0,
      conversionsValue:      day.conversionsValue      ?? 0,
    };
    await prisma.insight.upsert({
      where: { id: insightId },
      update: insightBase,
      create: {
        id: insightId,
        campaignId: campaign.id,
        tenantId:   campaign.tenantId ?? null,
        date:       new Date(day.date),
        ...insightBase,
      },
    });
    count++;
  }
  return count;
}

/** FASE 1 (Google Ads) A4 — grava os termos de busca reais no grão próprio (GoogleSearchTerm,
 *  não cabe em Insight que é campanha-dia). Preserva o `status` já setado por uma negativação
 *  anterior (agente ou humano) — o upsert nunca reseta pra 'none' num termo já tratado. */
async function collectGoogleSearchTerms(
  adapter: GoogleAdsAdapter,
  campaignId: string,
  tenantId: string | null,
  externalId: string,
  since: string,
  until: string,
) {
  if (!tenantId) return; // GoogleSearchTerm.tenantId é NOT NULL

  const terms = await adapter.fetchSearchTerms(externalId, { since, until });
  for (const t of terms) {
    await prisma.googleSearchTerm.upsert({
      where: {
        tenantId_campaignId_searchTerm_date: {
          tenantId,
          campaignId,
          searchTerm: t.searchTerm,
          date: new Date(t.date),
        },
      },
      update: {
        matchType:   t.matchType,
        impressions: t.impressions,
        clicks:      t.clicks,
        cost:        t.cost,
        conversions: t.conversions,
        // status NÃO é atualizado aqui — preserva 'negated'/'added_as_keyword' de rodadas anteriores
      },
      create: {
        tenantId,
        campaignId,
        searchTerm:  t.searchTerm,
        matchType:   t.matchType,
        date:        new Date(t.date),
        impressions: t.impressions,
        clicks:      t.clicks,
        cost:        t.cost,
        conversions: t.conversions,
      },
    });
  }
}

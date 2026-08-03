import cron from 'node-cron';
import prisma from '../prisma';
import { getNetworkServiceForTenant } from '../networks/factory';
import type { NetworkCode } from '../networks/types';
import { GoogleAdsAdapter } from '../networks/google/GoogleAdsAdapter';
import { runDecisor } from './agentDecisor';
import { generateStrategicBriefing } from './strategicBriefing';
import { notifyWhatsApp, notifySlack } from './agentNotificador';
import { inferLifecycleStatus } from './campaignStateMachine';
import { getProvisionedNetworkCodes } from './networkProvisioning';

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

  // Resolve networkId → code (public.ad_networks) para as redes distintas encontradas
  const networkIds = Array.from(new Set(campaigns.map(c => c.networkId).filter(Boolean))) as string[];
  const networkCodeById = new Map<string, string>();
  if (networkIds.length > 0) {
    const rows = await prisma.$queryRawUnsafe<{ id: string; code: string }[]>(
      `SELECT id, code FROM public.ad_networks WHERE id = ANY($1::uuid[])`,
      networkIds,
    );
    for (const r of rows) networkCodeById.set(r.id, r.code);
  }

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

    for (const campaign of tenantCampaigns) {
      // networkId ausente = campanha legada anterior ao FK (sempre Meta, via metaCampaignId)
      const networkCode = ((campaign.networkId ? networkCodeById.get(campaign.networkId) : null) || 'meta') as NetworkCode;
      const externalId = networkCode === 'meta' ? (campaign.metaCampaignId || campaign.externalId) : campaign.externalId;

      if (!externalId) continue;
      if (!provisionedNetworks.has(networkCode)) continue;

      let networkService: Awaited<ReturnType<typeof getNetworkServiceForTenant>>;
      try {
        networkService = await getNetworkServiceForTenant(tenantId, networkCode);
      } catch (e) {
        console.warn(`[syncMetrics] Configuração da rede ${networkCode} ausente para o tenant ${tenantId}`);
        continue;
      }

      try {
        await syncCampaignInsights(networkService, campaign, externalId, since, until);
      } catch (err) {
        console.error(`Erro ao sincronizar campanha ${campaign.id} (${networkCode}):`, err);
      }

      // FASE 1 (Google Ads) A4 — coletor de Search Terms (só Google; sustenta a negativação
      // automática, ver docs/PLANO_GOOGLE_TIKTOK.md A6). Falha isolada, não afeta o resto do sync.
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

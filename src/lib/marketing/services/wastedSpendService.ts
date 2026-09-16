import prisma from '../prisma';
import pool from '@/lib/database/connection';
import { resolveSegment } from '../../intelligence/segmentResolver';
import { resolveBenchmarks } from '../../intelligence/benchmarkResolver';
import { getLeadEvents, leadsByCampaign as groupLeadsByCampaign } from './leadEvents';
import { resolveCampaignNetworkCodes } from '../networkFilterUtils';
import { hasCrmModule } from './revenueAttributionService';

// Máscara monetária pt-BR (R$ 99.999,99) para as strings descritivas do relatório
const fmtBRL = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export interface WastedCampaign {
  id: string;
  name: string;
  wasted: number;
  details: string;
}

export interface WastedCategory {
  amount: number;
  campaigns: WastedCampaign[];
  explanation: string;
}

export interface WastedSpendReport {
  tenantId: string;
  clientId?: string;
  period: { start: Date; end: Date };
  totalWasted: number;
  byCategory: {
    ZERO_LEADS_SPEND:      WastedCategory;
    HIGH_CPL_SPEND:        WastedCategory;
    ELEVATED_CPL_SPEND:    WastedCategory;
    FATIGUED_CONTINUE:     WastedCategory;
    LEARNING_LIMITED:      WastedCategory;
    GOOD_CPL_NO_CONVERSION: WastedCategory;
  };
  /** Tier 3 do plano "Loop do ICP" — GOOD_CPL_NO_CONVERSION exige CRM contratado (correlação
   *  com negócio fechado). false = categoria sempre vazia, mesmo gate de hasCrmModule() já
   *  usado na Visão 4 (revenueAttributionService) — nunca finge um dado que o tenant não tem. */
  crmAvailable: boolean;
  recoveryPlan: string[];
}

export async function calculateWastedSpend(
  tenantId: string,
  clientId?: string | null,
  periodDays = 30,
): Promise<WastedSpendReport> {
  const since  = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const period = { start: since, end: new Date() };

  // 'own' e 'segment' são sentinelas de UI — só UUID real é cliente
  const realClientId = (clientId && clientId !== 'own' && clientId !== 'segment') ? clientId : null;

  const segment = await resolveSegment(tenantId, realClientId ?? undefined);
  const BENCHMARK_KEYS = ['cpl_ideal', 'cpl_critical', 'ctr_min', 'frequency_max', 'spend_no_lead', 'min_leads_scale', 'min_days_running'];
  // Benchmark "sem rede" — usado no relatório vazio e como fallback de rótulo antes de saber
  // quais redes existem no escopo (as explicações genéricas de categoria usam este).
  const b = await resolveBenchmarks(BENCHMARK_KEYS, tenantId, segment?.id ?? null, realClientId);

  const campWhere: any = { tenantId };
  if (clientId === 'own')   campWhere.clientId = null;        // Minha Empresa → campanhas próprias
  else if (realClientId)    campWhere.clientId = realClientId; // cliente específico
  // 'segment' ou ausente → sem filtro de cliente (todas as campanhas do tenant)

  const campaigns = await prisma.campaign.findMany({
    where: campWhere,
    select: { id: true, name: true, networkId: true },
  });

  if (campaigns.length === 0) return emptyReport(tenantId, clientId, period, b);

  const campaignIds = campaigns.map(c => c.id);

  // docs/PLANO_TIKTOK.md §7.3 — cpl_ideal/spend_no_lead/etc calibrados numa rede não valem
  // igual pra outra (achado bloqueante: TikTok julgado pelo padrão do Meta apareceria inflado
  // em HIGH_CPL_SPEND/ZERO_LEADS_SPEND). Benchmark resolvido por rede, com cache — 1 resolução
  // por rede distinta no escopo, não por campanha.
  const networkByCampaignId = await resolveCampaignNetworkCodes(campaigns as any);
  const benchmarksByNetwork = new Map<string, Record<string, number>>();
  benchmarksByNetwork.set('meta', b); // já resolvido acima; evita 1 chamada redundante pro caso comum
  async function benchmarksForNetwork(network: string): Promise<Record<string, number>> {
    if (benchmarksByNetwork.has(network)) return benchmarksByNetwork.get(network)!;
    const bm = await resolveBenchmarks(BENCHMARK_KEYS, tenantId, segment?.id ?? null, realClientId, network)
      .catch(() => b); // rede sem benchmark próprio configurado → cai no default do segmento
    benchmarksByNetwork.set(network, bm);
    return bm;
  }
  const uniqueNetworks = Array.from(new Set(Array.from(networkByCampaignId.values())));
  await Promise.all(uniqueNetworks.map(n => benchmarksForNetwork(n)));

  // Fonte única de lead (WhatsApp + formulário + conversão real do Google) — antes só contava
  // WHATSAPP_CLICK, o que classificava campanha de Google/formulário como "gasto sem lead"
  // (categoria ZERO_LEADS_SPEND abaixo) mesmo tendo lead real num canal não observado.
  const crmAvailable = await hasCrmModule(tenantId);
  const [insightGroups, leadEvents, dealsWonByCampaign] = await Promise.all([
    prisma.insight.groupBy({
      by: ['campaignId'],
      where: { campaignId: { in: campaignIds }, date: { gte: since } },
      _sum: { spend: true },
      _avg: { frequency: true },
      _count: { id: true },
    }),
    getLeadEvents(tenantId, { campaignIds, startDate: since, endDate: new Date() }),
    crmAvailable ? mapDealsWonByCampaign(tenantId, campaignIds, since) : Promise.resolve(new Map<string, number>()),
  ]);

  const leadsByCampaign = groupLeadsByCampaign(leadEvents);
  const campaignMap = new Map(campaigns.map(c => [c.id, c.name]));

  type Stats = {
    id: string; name: string; totalSpend: number; leads: number;
    avgFrequency: number; daysRunning: number; cpl: number; dealsWon: number;
    bench: Record<string, number>;
  };

  const stats: Stats[] = insightGroups
    .filter(g => (g._sum.spend ?? 0) > 0)
    .map(g => {
      const leads      = leadsByCampaign.get(g.campaignId) ?? 0;
      const totalSpend = g._sum.spend ?? 0;
      const network    = networkByCampaignId.get(g.campaignId) ?? 'meta';
      return {
        id: g.campaignId,
        name: campaignMap.get(g.campaignId) ?? g.campaignId,
        totalSpend,
        leads,
        avgFrequency: g._avg.frequency ?? 0,
        daysRunning:  g._count.id,
        cpl: leads > 0 ? totalSpend / leads : 0,
        dealsWon: dealsWonByCampaign.get(g.campaignId) ?? 0,
        bench: benchmarksByNetwork.get(network) ?? b,
      };
    });

  const zeroLeads:      WastedCampaign[] = [];
  const highCpl:        WastedCampaign[] = [];
  const elevatedCpl:    WastedCampaign[] = [];
  const fatigued:       WastedCampaign[] = [];
  const learningLimited: WastedCampaign[] = [];
  const goodCplNoConversion: WastedCampaign[] = [];
  const classified = new Set<string>();

  for (const s of stats) {
    const b = s.bench; // benchmark da REDE desta campanha (docs/PLANO_TIKTOK.md §7.3)
    // ZERO_LEADS_SPEND — most critical
    if (
      s.leads === 0 &&
      s.totalSpend > b.spend_no_lead &&
      s.daysRunning >= b.min_days_running
    ) {
      zeroLeads.push({
        id: s.id, name: s.name,
        wasted: s.totalSpend,
        details: `${fmtBRL(s.totalSpend)} gastos sem nenhum lead em ${s.daysRunning} dia(s)`,
      });
      classified.add(s.id);
      continue;
    }

    // HIGH_CPL_SPEND — CPL above critical threshold
    if (!classified.has(s.id) && s.leads > 0 && s.cpl > b.cpl_critical) {
      const wasted = Math.max(0, s.totalSpend - s.leads * b.cpl_ideal);
      highCpl.push({
        id: s.id, name: s.name,
        wasted,
        details: `CPL ${fmtBRL(s.cpl)} vs ideal ${fmtBRL(b.cpl_ideal)} — ${s.leads} lead(s)`,
      });
      classified.add(s.id);
      continue;
    }

    // ELEVATED_CPL_SPEND — CPL acima do ideal mas abaixo do crítico (desperdício "leve")
    if (!classified.has(s.id) && s.leads > 0 && s.cpl > b.cpl_ideal && s.cpl <= b.cpl_critical) {
      const wasted = Math.max(0, s.totalSpend - s.leads * b.cpl_ideal);
      if (wasted > 0) {
        elevatedCpl.push({
          id: s.id, name: s.name,
          wasted,
          details: `CPL ${fmtBRL(s.cpl)} acima do ideal ${fmtBRL(b.cpl_ideal)} (crítico ${fmtBRL(b.cpl_critical)}) — ${s.leads} lead(s)`,
        });
        classified.add(s.id);
        continue;
      }
    }

    // FATIGUED_CONTINUE — audience frequency above max
    if (!classified.has(s.id) && s.avgFrequency > b.frequency_max) {
      // waste fraction proportional to excess frequency (capped at 80%)
      const wasteFraction = Math.min(0.8, (s.avgFrequency - b.frequency_max) / s.avgFrequency);
      fatigued.push({
        id: s.id, name: s.name,
        wasted: s.totalSpend * wasteFraction,
        details: `Frequência ${s.avgFrequency.toFixed(1)}x (máx: ${b.frequency_max}x)`,
      });
      classified.add(s.id);
      continue;
    }

    // LEARNING_LIMITED — running long but too few results to exit learning phase
    if (
      !classified.has(s.id) &&
      s.daysRunning >= b.min_days_running * 2 &&
      s.leads > 0 &&
      s.leads < b.min_leads_scale
    ) {
      learningLimited.push({
        id: s.id, name: s.name,
        wasted: s.totalSpend * 0.35,
        details: `Apenas ${s.leads} lead(s) em ${s.daysRunning} dia(s) — preso na fase de aprendizado`,
      });
      classified.add(s.id);
      continue;
    }

    // GOOD_CPL_NO_CONVERSION — Tier 3 do plano "Loop do ICP": CPL dentro do ideal (nunca cai
    // em HIGH/ELEVATED_CPL_SPEND, que exigem cpl > cpl_ideal), volume e tempo suficientes pra
    // confiar que "zero venda" não é coincidência de amostra pequena, mas nenhum negócio
    // fechado no cohort — sinal que CPL sozinho nunca captura (lead barato, mas sem perfil de
    // comprador real). Só roda com CRM contratado (crmAvailable) — sem CRM, dealsWon é sempre
    // 0 pra QUALQUER campanha (nunca calculado), o que classificaria tudo errado como "zero
    // venda" mesmo sem dado nenhum de negócio — por isso o gate, não só a ausência do dado.
    if (
      crmAvailable &&
      !classified.has(s.id) &&
      s.cpl > 0 && s.cpl <= b.cpl_ideal &&
      s.leads >= b.min_leads_scale &&
      s.daysRunning >= b.min_days_running * 2 &&
      s.dealsWon === 0
    ) {
      goodCplNoConversion.push({
        id: s.id, name: s.name,
        wasted: s.totalSpend * 0.5,
        details: `CPL ${fmtBRL(s.cpl)} dentro do ideal, mas ${s.leads} lead(s) em ${s.daysRunning} dia(s) sem nenhum negócio fechado`,
      });
      classified.add(s.id);
    }
  }

  const sum = (arr: WastedCampaign[]) => arr.reduce((t, c) => t + c.wasted, 0);
  const zeroTotal     = sum(zeroLeads);
  const highTotal     = sum(highCpl);
  const elevatedTotal = sum(elevatedCpl);
  const fatiguedTotal = sum(fatigued);
  const learningTotal = sum(learningLimited);
  const goodCplTotal  = sum(goodCplNoConversion);
  const totalWasted   = zeroTotal + highTotal + elevatedTotal + fatiguedTotal + learningTotal + goodCplTotal;

  const recoveryPlan: string[] = [];
  if (zeroLeads.length > 0)
    recoveryPlan.push(`Pausar ${zeroLeads.length} campanha(s) com gasto sem leads e revisar segmentação e criativos`);
  if (highCpl.length > 0)
    recoveryPlan.push(`Otimizar ${highCpl.length} campanha(s) com CPL crítico — testar novos públicos e formatos de anúncio`);
  if (elevatedCpl.length > 0)
    recoveryPlan.push(`Ajustar ${elevatedCpl.length} campanha(s) com CPL acima do ideal — refinar público e criativos antes que vire crítico`);
  if (fatigued.length > 0)
    recoveryPlan.push(`Renovar criativos ou expandir audiência em ${fatigued.length} campanha(s) com fadiga detectada`);
  if (learningLimited.length > 0)
    recoveryPlan.push(`Consolidar orçamento ou ampliar público em ${learningLimited.length} campanha(s) presas no aprendizado`);
  if (goodCplNoConversion.length > 0)
    recoveryPlan.push(`Investigar ${goodCplNoConversion.length} campanha(s) com CPL bom mas zero negócio fechado — lead barato pode não ter perfil de comprador real`);
  if (recoveryPlan.length === 0)
    recoveryPlan.push('Nenhum desperdício crítico detectado — continue monitorando');

  return {
    tenantId,
    clientId: clientId ?? undefined,
    period,
    totalWasted,
    crmAvailable,
    byCategory: {
      ZERO_LEADS_SPEND: {
        amount: zeroTotal, campaigns: zeroLeads,
        explanation: 'Campanhas que consumiram verba sem gerar nenhum lead no período',
      },
      HIGH_CPL_SPEND: {
        amount: highTotal, campaigns: highCpl,
        explanation: `Excesso gasto acima do CPL ideal (${fmtBRL(b.cpl_ideal)}) em campanhas com custo por lead crítico (>${fmtBRL(b.cpl_critical)})`,
      },
      ELEVATED_CPL_SPEND: {
        amount: elevatedTotal, campaigns: elevatedCpl,
        explanation: `Excesso gasto acima do CPL ideal (${fmtBRL(b.cpl_ideal)}) em campanhas com CPL ainda abaixo do crítico (${fmtBRL(b.cpl_critical)}) — desperdício leve, evitável`,
      },
      FATIGUED_CONTINUE: {
        amount: fatiguedTotal, campaigns: fatigued,
        explanation: `Verba gasta com público saturado (frequência >${b.frequency_max}x) — rendimentos decrescentes`,
      },
      LEARNING_LIMITED: {
        amount: learningTotal, campaigns: learningLimited,
        explanation: 'Campanhas sem conversões suficientes para otimização automática da plataforma',
      },
      GOOD_CPL_NO_CONVERSION: {
        amount: goodCplTotal, campaigns: goodCplNoConversion,
        explanation: crmAvailable
          ? `CPL dentro do ideal (${fmtBRL(b.cpl_ideal)}), volume e tempo suficientes, mas nenhum negócio fechado no CRM — sinal que CPL sozinho não captura`
          : 'Indisponível — exige o módulo de CRM contratado para saber quais leads viraram negócio fechado',
      },
    },
    recoveryPlan,
  };
}

/** Negócios fechados no cohort do período, por campanha — mesma correlação e mesma semântica
 *  de janela (marketing_eventos.created_at dentro do período, negócio pode ter fechado depois)
 *  já usada em revenueAttributionService.ts/F6. Só chamada quando hasCrmModule() é true. */
async function mapDealsWonByCampaign(
  tenantId: string,
  campaignIds: string[],
  since: Date,
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (campaignIds.length === 0) return result;
  try {
    const { rows } = await pool.query(
      `SELECT me.campaign_id, COUNT(DISTINCT ls.lead_uuid)::int AS deals_won
         FROM public.marketing_eventos me
         JOIN public.leads_staging ls ON ls.lead_uuid = me.lead_uuid
         JOIN public.leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
         JOIN public.kanban_colunas kc ON kc.id = lk.coluna_id AND kc.is_ganho = true
        WHERE me.tenant_id = $1::uuid
          AND me.campaign_id = ANY($2::text[])
          AND me.created_at >= $3::timestamptz
        GROUP BY me.campaign_id`,
      [tenantId, campaignIds, since],
    );
    for (const r of rows) result.set(r.campaign_id, Number(r.deals_won));
  } catch (err: any) {
    console.warn('[wastedSpend] mapDealsWonByCampaign falhou — GOOD_CPL_NO_CONVERSION fica vazia:', err?.message);
  }
  return result;
}

function emptyReport(
  tenantId: string,
  clientId: string | null | undefined,
  period: { start: Date; end: Date },
  b: Record<string, number>,
): WastedSpendReport {
  return {
    tenantId,
    clientId: clientId ?? undefined,
    period,
    totalWasted: 0,
    crmAvailable: false,
    byCategory: {
      ZERO_LEADS_SPEND:   { amount: 0, campaigns: [], explanation: 'Campanhas que consumiram verba sem gerar nenhum lead no período' },
      HIGH_CPL_SPEND:     { amount: 0, campaigns: [], explanation: `Excesso gasto acima do CPL ideal (${fmtBRL(b.cpl_ideal ?? 30)}) em campanhas com custo por lead crítico` },
      ELEVATED_CPL_SPEND: { amount: 0, campaigns: [], explanation: `Excesso gasto acima do CPL ideal (${fmtBRL(b.cpl_ideal ?? 30)}), ainda abaixo do crítico — desperdício leve` },
      FATIGUED_CONTINUE:  { amount: 0, campaigns: [], explanation: 'Verba gasta com público saturado' },
      LEARNING_LIMITED:   { amount: 0, campaigns: [], explanation: 'Campanhas presas na fase de aprendizado' },
      GOOD_CPL_NO_CONVERSION: { amount: 0, campaigns: [], explanation: 'Sem campanhas no escopo para avaliar' },
    },
    recoveryPlan: ['Nenhum desperdício crítico detectado — continue monitorando'],
  };
}

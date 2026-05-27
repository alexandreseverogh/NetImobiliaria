import prisma from '../prisma';
import { resolveSegment } from '../../intelligence/segmentResolver';
import { resolveBenchmarks } from '../../intelligence/benchmarkResolver';

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
    ZERO_LEADS_SPEND:  WastedCategory;
    HIGH_CPL_SPEND:    WastedCategory;
    FATIGUED_CONTINUE: WastedCategory;
    LEARNING_LIMITED:  WastedCategory;
  };
  recoveryPlan: string[];
}

export async function calculateWastedSpend(
  tenantId: string,
  clientId?: string | null,
  periodDays = 30,
): Promise<WastedSpendReport> {
  const since  = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
  const period = { start: since, end: new Date() };

  const segment = await resolveSegment(tenantId, clientId ?? undefined);
  const b = await resolveBenchmarks(
    ['cpl_ideal', 'cpl_critical', 'ctr_min', 'frequency_max', 'spend_no_lead', 'min_leads_scale', 'min_days_running'],
    tenantId,
    segment?.id ?? null,
    clientId,
  );

  const campWhere: any = { tenantId };
  if (clientId === 'own') campWhere.clientId = null;
  else if (clientId)     campWhere.clientId = clientId;

  const campaigns = await prisma.campaign.findMany({
    where: campWhere,
    select: { id: true, name: true },
  });

  if (campaigns.length === 0) return emptyReport(tenantId, clientId, period, b);

  const campaignIds = campaigns.map(c => c.id);

  const [insightGroups, leadGroups] = await Promise.all([
    prisma.insight.groupBy({
      by: ['campaignId'],
      where: { campaignId: { in: campaignIds }, date: { gte: since } },
      _sum: { spend: true },
      _avg: { frequency: true },
      _count: { id: true },
    }),
    prisma.lead.groupBy({
      by: ['campaignId'],
      where: { campaignId: { in: campaignIds }, clickedAt: { gte: since } },
      _count: { id: true },
    }),
  ]);

  const leadsByCampaign = new Map(
    leadGroups
      .filter(g => g.campaignId != null)
      .map(g => [g.campaignId as string, g._count.id]),
  );
  const campaignMap = new Map(campaigns.map(c => [c.id, c.name]));

  type Stats = {
    id: string; name: string; totalSpend: number; leads: number;
    avgFrequency: number; daysRunning: number; cpl: number;
  };

  const stats: Stats[] = insightGroups
    .filter(g => (g._sum.spend ?? 0) > 0)
    .map(g => {
      const leads      = leadsByCampaign.get(g.campaignId) ?? 0;
      const totalSpend = g._sum.spend ?? 0;
      return {
        id: g.campaignId,
        name: campaignMap.get(g.campaignId) ?? g.campaignId,
        totalSpend,
        leads,
        avgFrequency: g._avg.frequency ?? 0,
        daysRunning:  g._count.id,
        cpl: leads > 0 ? totalSpend / leads : 0,
      };
    });

  const zeroLeads:      WastedCampaign[] = [];
  const highCpl:        WastedCampaign[] = [];
  const fatigued:       WastedCampaign[] = [];
  const learningLimited: WastedCampaign[] = [];
  const classified = new Set<string>();

  for (const s of stats) {
    // ZERO_LEADS_SPEND — most critical
    if (
      s.leads === 0 &&
      s.totalSpend > b.spend_no_lead &&
      s.daysRunning >= b.min_days_running
    ) {
      zeroLeads.push({
        id: s.id, name: s.name,
        wasted: s.totalSpend,
        details: `R$${s.totalSpend.toFixed(2)} gastos sem nenhum lead em ${s.daysRunning} dia(s)`,
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
        details: `CPL R$${s.cpl.toFixed(2)} vs ideal R$${b.cpl_ideal.toFixed(2)} — ${s.leads} lead(s)`,
      });
      classified.add(s.id);
      continue;
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
    }
  }

  const sum = (arr: WastedCampaign[]) => arr.reduce((t, c) => t + c.wasted, 0);
  const zeroTotal     = sum(zeroLeads);
  const highTotal     = sum(highCpl);
  const fatiguedTotal = sum(fatigued);
  const learningTotal = sum(learningLimited);
  const totalWasted   = zeroTotal + highTotal + fatiguedTotal + learningTotal;

  const recoveryPlan: string[] = [];
  if (zeroLeads.length > 0)
    recoveryPlan.push(`Pausar ${zeroLeads.length} campanha(s) com gasto sem leads e revisar segmentação e criativos`);
  if (highCpl.length > 0)
    recoveryPlan.push(`Otimizar ${highCpl.length} campanha(s) com CPL crítico — testar novos públicos e formatos de anúncio`);
  if (fatigued.length > 0)
    recoveryPlan.push(`Renovar criativos ou expandir audiência em ${fatigued.length} campanha(s) com fadiga detectada`);
  if (learningLimited.length > 0)
    recoveryPlan.push(`Consolidar orçamento ou ampliar público em ${learningLimited.length} campanha(s) presas no aprendizado`);
  if (recoveryPlan.length === 0)
    recoveryPlan.push('Nenhum desperdício crítico detectado — continue monitorando');

  return {
    tenantId,
    clientId: clientId ?? undefined,
    period,
    totalWasted,
    byCategory: {
      ZERO_LEADS_SPEND: {
        amount: zeroTotal, campaigns: zeroLeads,
        explanation: 'Campanhas que consumiram verba sem gerar nenhum lead no período',
      },
      HIGH_CPL_SPEND: {
        amount: highTotal, campaigns: highCpl,
        explanation: `Excesso gasto acima do CPL ideal (R$${b.cpl_ideal.toFixed(2)}) em campanhas com custo por lead crítico (>R$${b.cpl_critical.toFixed(2)})`,
      },
      FATIGUED_CONTINUE: {
        amount: fatiguedTotal, campaigns: fatigued,
        explanation: `Verba gasta com público saturado (frequência >${b.frequency_max}x) — rendimentos decrescentes`,
      },
      LEARNING_LIMITED: {
        amount: learningTotal, campaigns: learningLimited,
        explanation: 'Campanhas sem conversões suficientes para otimização automática da plataforma',
      },
    },
    recoveryPlan,
  };
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
    byCategory: {
      ZERO_LEADS_SPEND:  { amount: 0, campaigns: [], explanation: 'Campanhas que consumiram verba sem gerar nenhum lead no período' },
      HIGH_CPL_SPEND:    { amount: 0, campaigns: [], explanation: `Excesso gasto acima do CPL ideal (R$${b.cpl_ideal?.toFixed(2) ?? '30.00'})` },
      FATIGUED_CONTINUE: { amount: 0, campaigns: [], explanation: 'Verba gasta com público saturado' },
      LEARNING_LIMITED:  { amount: 0, campaigns: [], explanation: 'Campanhas presas na fase de aprendizado' },
    },
    recoveryPlan: ['Nenhum desperdício crítico detectado — continue monitorando'],
  };
}

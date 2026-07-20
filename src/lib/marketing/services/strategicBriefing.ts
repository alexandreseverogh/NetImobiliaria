import prisma from '../prisma';
import pool from '@/lib/database/connection';
import { invokeForContext } from '../../intelligence/llmInvoker';
import { generateAiInsights } from './aiInsights';
import { getAngleInsights, type AngleInsightsResult } from './angleInsightsService';
import { getActiveSegmentsForScope } from './segmentTaxonomyService';

const S = 'campanhasmarketingdigital';

/** IDs das campanhas de um segmento dentro do escopo (tenant + cliente opcional). */
async function getSegmentCampaignIds(
  tenantId: string,
  segmentId: string,
  clientId?: string,
): Promise<string[]> {
  const clientFilter = clientId && clientId !== 'own' && clientId !== 'all' ? clientId : null;
  const { rows } = await pool.query(
    `SELECT cam.id
     FROM ${S}."Campaign" cam
     LEFT JOIN public.clientes cl ON cl.uuid = cam.client_id
     LEFT JOIN public.tenants  t  ON t.id    = cam.tenant_id
     WHERE cam.tenant_id = $1::uuid
       AND ( cl.segment_id = $2::uuid OR (cam.client_id IS NULL AND t.segment_id = $2::uuid) )
       AND ($3::uuid IS NULL OR cam.client_id = $3::uuid)`,
    [tenantId, segmentId, clientFilter],
  );
  return rows.map(r => r.id);
}

interface CampaignMetrics {
  campaignId: string;
  campaignName: string;
  status: string;
  objective: string;
  totalSpend: number;
  totalClicks: number;
  totalImpressions: number;
  totalReach: number;
  totalConversions: number;
  avgCtr: number;
  avgCpc: number;
  avgCpm: number;
  avgFrequency: number;
  leads: number;
  cpl: number | null;
  dailyBudget: number;
  daysRunning: number;
  spendTrend: 'up' | 'down' | 'stable';
}

interface BriefingContext {
  date: string;
  periodDays: number;
  campaigns: CampaignMetrics[];
  totals: {
    spend: number;
    clicks: number;
    impressions: number;
    leads: number;
    campaigns: number;
    activeCampaigns: number;
  };
  previousPeriod: {
    spend: number;
    clicks: number;
    impressions: number;
    leads: number;
  };
  deltas: {
    spend: number;
    clicks: number;
    impressions: number;
    leads: number;
  };
  ruleInsights: any[];
  // FASE 14b — ângulo de comunicação efetivo
  angleInsights: AngleInsightsResult;
}

function calculateSpendTrend(insights: any[]): 'up' | 'down' | 'stable' {
  if (insights.length < 4) return 'stable';
  const mid = Math.floor(insights.length / 2);
  const recent = insights.slice(0, mid);
  const older = insights.slice(mid);
  const recentAvg = recent.reduce((s: number, i: any) => s + i.spend, 0) / recent.length;
  const olderAvg = older.reduce((s: number, i: any) => s + i.spend, 0) / older.length;
  if (recentAvg > olderAvg * 1.15) return 'up';
  if (recentAvg < olderAvg * 0.85) return 'down';
  return 'stable';
}

function pctDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export async function gatherBriefingContext(
  periodDays: number,
  tenantId?: string,
  clientId?: string,
  opts?: { segmentId?: string; precomputedRuleInsights?: any[]; startDate?: string; endDate?: string },
): Promise<BriefingContext> {
  const now = new Date();
  // Se datas explícitas forem passadas, usa-as (alinha com o filtro do dashboard).
  // Caso contrário, calcula a janela a partir de agora.
  const startDate = opts?.startDate
    ? new Date(opts.startDate)
    : new Date(now.getTime() - periodDays * 86400000);
  const endDateObj = opts?.endDate ? new Date(opts.endDate) : now;
  const effectivePeriodDays = Math.max(1,
    Math.ceil((endDateObj.getTime() - startDate.getTime()) / 86400000) + 1,
  );
  const prevStartDate = new Date(startDate.getTime() - effectivePeriodDays * 86400000);
  const segmentId = opts?.segmentId;

  const campaignFilter: any = tenantId ? { tenantId } : {};
  if (clientId === 'own') {
    campaignFilter.clientId = null;
  } else if (clientId) {
    campaignFilter.clientId = clientId;
  }
  // FASE 18.2 — restringe às campanhas do segmento
  if (segmentId && tenantId) {
    const ids = await getSegmentCampaignIds(tenantId, segmentId, clientId);
    campaignFilter.id = { in: ids.length > 0 ? ids : ['__none__'] };
  }
  const allCampaigns = await prisma.campaign.findMany({
    where: campaignFilter,
    include: { adSets: true },
  });

  const campaignMetrics: CampaignMetrics[] = [];
  let totalSpend = 0, totalClicks = 0, totalImpressions = 0, totalLeads = 0;
  let prevSpend = 0, prevClicks = 0, prevImpressions = 0, prevLeads = 0;

  for (const campaign of allCampaigns) {
    const insights = await prisma.insight.findMany({
      where: { campaignId: campaign.id, date: { gte: startDate, lte: endDateObj } },
      orderBy: { date: 'desc' },
    });

    const prevInsights = await prisma.insight.findMany({
      where: { campaignId: campaign.id, date: { gte: prevStartDate, lt: startDate } },
    });

    const leads = await prisma.ctaInteraction.count({
      where: { tenantId: tenantId || undefined, campaignId: campaign.id, eventType: 'WHATSAPP_CLICK', createdAt: { gte: startDate, lte: endDateObj } },
    });

    const prevLeadCount = await prisma.ctaInteraction.count({
      where: { tenantId: tenantId || undefined, campaignId: campaign.id, eventType: 'WHATSAPP_CLICK', createdAt: { gte: prevStartDate, lt: startDate } },
    });

    if (insights.length === 0 && leads === 0) continue;

    const spend = insights.reduce((s, i) => s + i.spend, 0);
    const clicks = insights.reduce((s, i) => s + i.clicks, 0);
    const impressions = insights.reduce((s, i) => s + i.impressions, 0);
    const reach = insights.reduce((s, i) => s + i.reach, 0);
    const conversions = insights.reduce((s, i) => s + i.conversions, 0);
    const frequency = insights.length > 0
      ? insights.reduce((s, i) => s + (i.frequency || 0), 0) / insights.length : 0;

    const dailyBudget = campaign.adSets.length > 0
      ? campaign.adSets[0].dailyBudget / 100 : 0;

    campaignMetrics.push({
      campaignId: campaign.id,
      campaignName: campaign.name,
      status: campaign.status,
      objective: campaign.objective,
      totalSpend: spend,
      totalClicks: clicks,
      totalImpressions: impressions,
      totalReach: reach,
      totalConversions: conversions,
      avgCtr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      avgCpc: clicks > 0 ? spend / clicks : 0,
      avgCpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      avgFrequency: frequency,
      leads,
      cpl: leads > 0 ? spend / leads : null,
      dailyBudget,
      daysRunning: insights.length,
      spendTrend: calculateSpendTrend(insights),
    });

    totalSpend += spend;
    totalClicks += clicks;
    totalImpressions += impressions;
    totalLeads += leads;

    prevSpend += prevInsights.reduce((s, i) => s + i.spend, 0);
    prevClicks += prevInsights.reduce((s, i) => s + i.clicks, 0);
    prevImpressions += prevInsights.reduce((s, i) => s + i.impressions, 0);
    prevLeads += prevLeadCount;
  }

  // FASE 18.2 — quando há insights pré-computados do segmento, usa-os (evita recomputar)
  const ruleInsights = opts?.precomputedRuleInsights
    ?? (await generateAiInsights(undefined, tenantId, clientId)).insights;

  // FASE 14b/18.2 — métricas por ângulo efetivo, filtradas pelo segmento quando aplicável
  const angleInsights = await getAngleInsights(periodDays, tenantId, clientId, segmentId);

  return {
    date: now.toISOString().split('T')[0],
    periodDays,
    campaigns: campaignMetrics,
    totals: {
      spend: totalSpend,
      clicks: totalClicks,
      impressions: totalImpressions,
      leads: totalLeads,
      campaigns: allCampaigns.length,
      activeCampaigns: allCampaigns.filter(c => c.status === 'ACTIVE').length,
    },
    previousPeriod: { spend: prevSpend, clicks: prevClicks, impressions: prevImpressions, leads: prevLeads },
    deltas: {
      spend: pctDelta(totalSpend, prevSpend),
      clicks: pctDelta(totalClicks, prevClicks),
      impressions: pctDelta(totalImpressions, prevImpressions),
      leads: pctDelta(totalLeads, prevLeads),
    },
    ruleInsights,
    angleInsights,
  };
}

function formatDelta(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}`;
}

function buildBriefingVariables(
  type: 'morning' | 'closing' | 'manual',
  context: BriefingContext,
): Record<string, string> {
  const ruleInsightsText = context.ruleInsights.length > 0
    ? context.ruleInsights
        .map(i => `- [${i.type}] ${i.title}: ${i.description} (confiança: ${(i.confidence * 100).toFixed(0)}%)`)
        .join('\n')
    : 'Nenhum alerta automático detectado.';

  return {
    period_days:       String(context.periodDays),
    campaigns_json:    JSON.stringify(context.campaigns, null, 2),
    total_spend:       context.totals.spend.toFixed(2),
    total_clicks:      String(context.totals.clicks),
    total_impressions: String(context.totals.impressions),
    total_leads:       String(context.totals.leads),
    active_campaigns:  String(context.totals.activeCampaigns),
    total_campaigns:   String(context.totals.campaigns),
    delta_spend:       formatDelta(context.deltas.spend),
    delta_clicks:      formatDelta(context.deltas.clicks),
    delta_impressions: formatDelta(context.deltas.impressions),
    delta_leads:       formatDelta(context.deltas.leads),
    rule_insights:     ruleInsightsText,
    briefing_type:     type,
    // FASE 14b — sinal de ângulo (disponível para templates que declarem {{angle_insights}})
    angle_insights:    context.angleInsights?.textSummary ?? 'Análise de ângulo indisponível.',
    winning_angle:     context.angleInsights?.topAngle?.label ?? 'não identificado',
    worst_angle:       context.angleInsights?.worstAngle?.label ?? 'não identificado',
  };
}

export async function generateStrategicBriefing(
  type: 'morning' | 'closing' | 'manual',
  tenantId?: string,
  clientId?: string,
  periodDaysOverride?: number,
  segment?: { id: string; name: string },
  precomputedRuleInsights?: any[],
  dateRange?: { startDate?: string; endDate?: string },
) {
  const periodDays = periodDaysOverride ?? (type === 'closing' ? 1 : 7);
  const context = await gatherBriefingContext(periodDays, tenantId, clientId, {
    segmentId: segment?.id,
    startDate: dateRange?.startDate,
    endDate:   dateRange?.endDate,
    precomputedRuleInsights,
  });
  const segFields = { segmentId: segment?.id ?? null, segmentName: segment?.name ?? null };

  if (context.campaigns.length === 0) {
    const empty = {
      urgentAlerts: [],
      performanceSummary: 'Nenhuma campanha com dados no periodo analisado.',
      campaignAnalysis: [],
      budgetRecommendations: [],
      actionItems: [],
      tomorrowPlan: 'Aguardar dados das campanhas.',
    };

    return prisma.strategicBriefing.create({
      data: {
        type,
        tenantId:   tenantId || null,
        clientId:   (!clientId || clientId === 'own') ? null : clientId,
        ...segFields,
        periodDays: periodDays,
        content:    empty as any,
        summary:    empty.performanceSummary,
      },
    });
  }

  try {
    const templateKey = type === 'morning' ? 'briefing_morning'
      : type === 'closing' ? 'briefing_closing'
      : 'briefing_manual';

    const text = await invokeForContext({
      templateKey,
      tenantId: tenantId ?? '',
      clientId,
      variables: buildBriefingVariables(type, context),
      maxTokens: 2000,
    });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    const briefingContent = {
      urgentAlerts: parsed.urgentAlerts || [],
      performanceSummary: parsed.performanceSummary || '',
      campaignAnalysis: parsed.campaignAnalysis || [],
      budgetRecommendations: parsed.budgetRecommendations || [],
      actionItems: parsed.actionItems || [],
      tomorrowPlan: parsed.tomorrowPlan || '',
    };

    return prisma.strategicBriefing.create({
      data: {
        type,
        tenantId:   tenantId || null,
        clientId:   (!clientId || clientId === 'own') ? null : clientId,
        ...segFields,
        periodDays: periodDays,
        content:    briefingContent as any,
        summary:    briefingContent.performanceSummary.slice(0, 500),
      },
    });
  } catch (err) {
    const fallback = {
      urgentAlerts: context.ruleInsights.filter(i => i.type === 'PAUSE').map(i => `${i.title}: ${i.description}`),
      performanceSummary: `Periodo: R$${context.totals.spend.toFixed(2)} gastos, ${context.totals.clicks} cliques, ${context.totals.leads} leads. Analise LLM indisponivel — usando alertas automaticos.`,
      campaignAnalysis: context.campaigns.map(c => ({
        campaignName: c.campaignName,
        status: c.avgCtr < 1 ? 'critical' : c.avgCtr < 2 ? 'warning' : 'healthy',
        recommendation: c.cpl && c.cpl > 20 ? 'CPL alto — otimizar segmentacao' : 'Manter monitoramento',
        priority: c.avgCtr < 1 ? 'high' : 'medium',
      })),
      budgetRecommendations: [],
      actionItems: context.ruleInsights.map(i => i.description),
      tomorrowPlan: 'Verificar conexao com LLM e revisar campanhas manualmente.',
    };

    return prisma.strategicBriefing.create({
      data: {
        type,
        tenantId:   tenantId || null,
        clientId:   (!clientId || clientId === 'own') ? null : clientId,
        ...segFields,
        periodDays: periodDays,
        content:    fallback as any,
        summary:    fallback.performanceSummary.slice(0, 500),
      },
    });
  }
}

/* ──────────────────────────────────────────────────────────────
   FASE 18.2 — Orquestração por segmento
────────────────────────────────────────────────────────────── */

/**
 * Gera um briefing POR SEGMENTO no escopo (tenant + cliente opcional).
 * Cliente único → 1 briefing (segmento do cliente). Agregado → N briefings.
 */
export async function generateBriefingsForScope(
  type: 'morning' | 'closing' | 'manual',
  tenantId?: string,
  clientId?: string,
  periodDaysOverride?: number,
  dateRange?: { startDate?: string; endDate?: string },
) {
  const periodDays = periodDaysOverride ?? (type === 'closing' ? 1 : 7);
  if (!tenantId) return [await generateStrategicBriefing(type, tenantId, clientId, periodDays, undefined, undefined, dateRange)];

  const segments = await getActiveSegmentsForScope(tenantId, clientId);
  if (segments.length === 0) {
    return [await generateStrategicBriefing(type, tenantId, clientId, periodDays, undefined, undefined, dateRange)];
  }

  const aiResult: any = await generateAiInsights(undefined, tenantId, clientId);
  const bySeg = new Map<string, any[]>((aiResult.bySegment ?? []).map((g: any) => [g.segmentId, g.insights]));

  const out = [];
  for (const seg of segments) {
    const ruleInsights = bySeg.get(seg.id) ?? [];
    out.push(await generateStrategicBriefing(type, tenantId, clientId, periodDays, { id: seg.id, name: seg.name }, ruleInsights, dateRange));
  }
  return out;
}

/** Último briefing POR SEGMENTO no escopo. */
export async function getLatestBriefingsForScope(
  type?: string,
  tenantId?: string,
  clientId?: string,
  segmentId?: string,
) {
  // Se um segmento específico foi solicitado, retornar apenas o último desse segmento
  if (segmentId && tenantId) {
    const where: any = { tenantId, segmentId };
    if (type) where.type = type;
    if (clientId === 'own')  where.clientId = null;
    else if (clientId)       where.clientId = clientId;
    const b = await prisma.strategicBriefing.findFirst({ where, orderBy: { createdAt: 'desc' } });
    return b ? [b] : [];
  }

  if (!tenantId) {
    const b = await getLatestBriefing(type, tenantId, clientId);
    return b ? [b] : [];
  }
  const segments = await getActiveSegmentsForScope(tenantId, clientId);
  if (segments.length === 0) {
    const b = await getLatestBriefing(type, tenantId, clientId);
    return b ? [b] : [];
  }
  const out = [];
  for (const seg of segments) {
    const where: any = { tenantId, segmentId: seg.id };
    if (type) where.type = type;
    const b = await prisma.strategicBriefing.findFirst({ where, orderBy: { createdAt: 'desc' } });
    if (b) out.push(b);
  }
  return out;
}

export async function getLatestBriefing(type?: string, tenantId?: string, clientId?: string) {
  const where: any = {};
  if (type)     where.type     = type;
  if (tenantId) where.tenantId = tenantId;
  if (clientId === 'own') {
    where.clientId = null;
  } else if (clientId) {
    where.clientId = clientId;
  }
  return prisma.strategicBriefing.findFirst({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getBriefingHistory(
  limit = 10,
  type?: string,
  tenantId?: string,
  clientId?: string,
  segmentId?: string,
) {
  const where: any = {};
  if (type)      where.type      = type;
  if (tenantId)  where.tenantId  = tenantId;
  if (segmentId) where.segmentId = segmentId;
  if (clientId === 'own') {
    where.clientId = null;
  } else if (clientId) {
    where.clientId = clientId;
  }
  return prisma.strategicBriefing.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

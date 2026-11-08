/**
 * FASE 9 — Audit Report Estruturado
 *
 * Gera um relatório mensal/semanal com:
 *  - Health scorecard (5 dimensões)
 *  - Top 3 problemas detectados
 *  - Top 3 oportunidades
 *  - Wasted spend consolidado
 *  - Plano de ação semanal
 *  - Narrativa gerada por LLM (opcional)
 */

import { prisma } from '@/lib/marketing/prisma';
import { calculateWastedSpend } from './wastedSpendService';
import { runTrackingHealthCheck } from './trackingHealthService';
import { resolveSegment } from '@/lib/intelligence/segmentResolver';
import { resolveBenchmarks } from '@/lib/intelligence/benchmarkResolver';
import { invokeForContext } from '@/lib/intelligence/llmInvoker';
import { getLeadEvents, sumLeads } from './leadEvents';
import { loadAuditBands, singleValue, statusFor, bandFor, scoreByBands, type AuditBandSet } from './auditScoringBands';
import { loadAuditTexts, textParam, formatRange, type AuditTextParam } from './auditTextSettings';

// ─────────────────────────────────────────────────────────────
//  TIPOS PÚBLICOS
// ─────────────────────────────────────────────────────────────

export interface ScorecardDimension {
  id: string;
  label: string;
  score: number;        // 0-100
  weight: number;       // peso relativo
  detail: string;       // explicação humana
  status: 'ok' | 'warn' | 'critical';
}

export interface AuditProblem {
  rank: number;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  dimensionId: string;
  metric?: string;      // valor medido (ex: "CPL R$350")
}

export interface AuditOpportunity {
  rank: number;
  title: string;
  description: string;
  potentialGain: string;
  dimensionId: string;
}

export interface ActionItem {
  week: number;         // 1-4
  priority: 'urgent' | 'high' | 'medium';
  action: string;
  owner: string;        // 'gestor' | 'agência' | 'sistema'
}

export interface AuditReportData {
  id?: string;
  tenantId: string;
  clientId?: string | null;
  period: { start: Date; end: Date; days: number };
  overallScore: number;
  scorecard: ScorecardDimension[];
  problems: AuditProblem[];
  opportunities: AuditOpportunity[];
  wastedSpend: {
    total: number;
    byCategory: Record<string, number>;
    topCampaigns: Array<{ name: string; amount: number; reason: string }>;
  };
  actionPlan: ActionItem[];
  narrative?: string;
  createdAt?: Date;
}

// ─────────────────────────────────────────────────────────────
//  Pesos, notas e cortes vêm de audit_scoring_bands (ver auditScoringBands.ts)
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  GERAÇÃO DO RELATÓRIO
// ─────────────────────────────────────────────────────────────

export async function generateAuditReport(
  tenantId: string,
  clientId?: string | null,
  periodDays = 30,
  withNarrative = false,
  campaignId?: string | null,
): Promise<AuditReportData> {
  const endDate   = new Date();
  const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);

  const segment = await resolveSegment(tenantId, clientId ?? undefined);
  if (!segment) throw new Error('Auditoria sem segmento configurado — defina o segmento do tenant ou cliente.');
  const bands = await loadAuditBands(segment.id);
  const texts = await loadAuditTexts(segment.id);
  const b = await resolveBenchmarks(
    ['cpl_ideal', 'cpl_critical', 'ctr_min', 'frequency_max', 'hook_rate_critical'],
    tenantId,
    segment?.id ?? null,
    clientId,
  );

  // ── Coletar dados em paralelo ──────────────────────────────
  const [wastedRaw, healthRaw, metricsRaw, funnelRaw] = await Promise.all([
    calculateWastedSpend(tenantId, clientId, periodDays).catch(() => null),
    // 'segment' e 'own' são sentinelas da tela (Todos os Clientes / Minha Empresa), não IDs de cliente.
    runTrackingHealthCheck(tenantId, clientId && clientId !== 'segment' && clientId !== 'own' ? clientId : null)
      .catch(err => {
        console.error('[AUDIT] Falha no check de rastreamento — usando valor padrão:', err);
        return null;
      }),
    collectCampaignMetrics(tenantId, clientId, startDate, campaignId),
    collectFunnelMetrics(tenantId, clientId, startDate, campaignId),
  ]);

  // ── Dimensão 1: Performance ────────────────────────────────
  const perfDim = scoreDimensionPerformance(metricsRaw, b, bands);

  // ── Dimensão 2: Spend Efficiency ──────────────────────────
  const spendDim = scoreDimensionSpendEfficiency(wastedRaw, metricsRaw, bands);

  // ── Dimensão 3: Funnel Health ──────────────────────────────
  const funnelDim = scoreDimensionFunnel(funnelRaw, b, bands);

  // ── Dimensão 4: Tracking ──────────────────────────────────
  const trackingDim = scoreDimensionTracking(healthRaw, bands);

  // ── Dimensão 5: Creative ──────────────────────────────────
  const creativeDim = scoreDimensionCreative(metricsRaw, b, bands);

  const scorecard: ScorecardDimension[] = [
    perfDim, spendDim, funnelDim, trackingDim, creativeDim,
  ];

  // ── Overall Score (média ponderada) ───────────────────────
  const totalWeight = scorecard.reduce((s, d) => s + d.weight, 0);
  // (pesos vêm de audit_scoring_bands; somam o que o segmento configurou)
  const overallScore = Math.round(
    scorecard.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight,
  );

  // ── Problemas (top 3 piores dimensões + issues específicos) ─
  const problems = buildProblems(scorecard, wastedRaw, metricsRaw, funnelRaw, b, bands, texts, segment.id);

  // ── Oportunidades (top 3 melhorias de maior impacto) ──────
  const opportunities = buildOpportunities(scorecard, metricsRaw, funnelRaw, b, bands, texts, segment.id);

  // ── Wasted Spend consolidado ───────────────────────────────
  const wastedSpend = buildWastedSpendSummary(wastedRaw, textParam(texts, segment.id, 'client_campaigns_top').min, textParam(texts, segment.id, 'tenant_campaigns_top').min);

  // ── Plano de ação ─────────────────────────────────────────
  const actionPlan = buildActionPlan(problems, opportunities, wastedRaw);

  // ── Narrativa LLM (opcional) ──────────────────────────────
  let narrative: string | undefined;
  if (withNarrative) {
    narrative = await generateNarrative(
      tenantId, clientId, periodDays, overallScore,
      scorecard, problems, opportunities, wastedSpend.total, actionPlan,
      startDate, endDate,
    ).catch(() => undefined);
  }

  return {
    tenantId,
    clientId,
    period: { start: startDate, end: endDate, days: periodDays },
    overallScore,
    scorecard,
    problems,
    opportunities,
    wastedSpend,
    actionPlan,
    narrative,
  };
}

// ─────────────────────────────────────────────────────────────
//  PERSISTÊNCIA
// ─────────────────────────────────────────────────────────────

export async function saveAuditReport(
  report: AuditReportData,
): Promise<string> {
  const startDate = new Date(report.period.start);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(report.period.end);
  endDate.setHours(0, 0, 0, 0);

  // 'own' é um valor de UI (campanhas sem cliente = client_id IS NULL).
  // No DB, clientId deve ser null ou um UUID válido — nunca a string 'own'.
  const dbClientId = (report.clientId === 'own' || !report.clientId)
    ? null
    : report.clientId;

  // Prisma não suporta upsert com campos nullable em unique constraints compostos.
  // Workaround: findFirst + create/update manualmente.
  const existing = await (prisma as any).auditReport.findFirst({
    where: {
      tenantId:    report.tenantId,
      clientId:    dbClientId,
      periodStart: startDate,
      periodEnd:   endDate,
    },
    select: { id: true },
  });

  const payload = {
    overallScore:  report.overallScore,
    scorecard:     report.scorecard     as any,
    problems:      report.problems      as any,
    opportunities: report.opportunities as any,
    wastedSpend:   report.wastedSpend   as any,
    actionPlan:    report.actionPlan    as any,
    narrative:     report.narrative ?? null,
  };

  if (existing) {
    await (prisma as any).auditReport.update({
      where: { id: existing.id },
      data:  payload,
    });
    return existing.id as string;
  }

  const created = await (prisma as any).auditReport.create({
    data: {
      tenantId:    report.tenantId,
      clientId:    dbClientId,
      periodStart: startDate,
      periodEnd:   endDate,
      ...payload,
    },
  });
  return created.id as string;
}

export async function listAuditReports(
  tenantId: string,
  clientId?: string | null,
  limit = 12,
) {
  const where: any = { tenantId };
  if (clientId === 'own') where.clientId = null;
  else if (clientId)      where.clientId = clientId;

  return (prisma as any).auditReport.findMany({
    where,
    orderBy: { periodStart: 'desc' },
    take: limit,
    select: {
      id: true, periodStart: true, periodEnd: true,
      overallScore: true, createdAt: true,
      scorecard: true, problems: true, opportunities: true,
      wastedSpend: true, actionPlan: true, narrative: true,
    },
  });
}

export async function getLatestAuditReport(
  tenantId: string,
  clientId?: string | null,
) {
  const where: any = { tenantId };
  if (clientId === 'own') where.clientId = null;
  else if (clientId)      where.clientId = clientId;

  return (prisma as any).auditReport.findFirst({
    where,
    orderBy: { periodStart: 'desc' },
  });
}

// ─────────────────────────────────────────────────────────────
//  HELPERS — coleta de métricas
// ─────────────────────────────────────────────────────────────

interface CampaignMetrics {
  totalSpend: number;
  totalLeads: number;
  cpl: number;
  activeCampaigns: number;
  avgCtr: number;
  avgFrequency: number;
  avgHookRate: number;
  campaignCount: number;
}

async function collectCampaignMetrics(
  tenantId: string,
  clientId: string | null | undefined,
  since: Date,
  campaignId?: string | null,
): Promise<CampaignMetrics> {
  const campWhere: any = { tenantId };
  if (clientId === 'own') campWhere.clientId = null;
  else if (clientId)      campWhere.clientId = clientId;
  if (campaignId)         campWhere.id       = campaignId;

  try {
    const campaigns = await prisma.campaign.findMany({
      where: campWhere,
      select: { id: true, status: true },
    });
    if (campaigns.length === 0) return emptyCampaignMetrics();

    const ids = campaigns.map(c => c.id);
    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;

    const [insights, leadEvents] = await Promise.all([
      prisma.insight.aggregate({
        where: { campaignId: { in: ids }, date: { gte: since } },
        _sum: { spend: true, clicks: true, impressions: true, videoViews3s: true },
        _avg: { ctr: true, frequency: true },
        _count: { id: true },
      }),
      // Fonte única de lead (WhatsApp + formulário + conversão real do Google) — antes só
      // WHATSAPP_CLICK, subestimando o CPL/leads do relatório de auditoria pra campanhas de Google.
      getLeadEvents(tenantId, { campaignIds: ids, startDate: since, endDate: new Date() }),
    ]);
    const leads = sumLeads(leadEvents);

    const totalSpend = insights._sum.spend ?? 0;
    const totalImpressions = insights._sum.impressions ?? 0;
    const totalVideoViews3s = (insights._sum as any).videoViews3s ?? 0;

    return {
      totalSpend,
      totalLeads: leads,
      cpl: leads > 0 ? totalSpend / leads : 0,
      activeCampaigns,
      avgCtr: insights._avg.ctr ?? 0,
      avgFrequency: insights._avg.frequency ?? 0,
      avgHookRate: totalImpressions > 0 ? (totalVideoViews3s / totalImpressions) * 100 : 0,
      campaignCount: campaigns.length,
    };
  } catch {
    return emptyCampaignMetrics();
  }
}

function emptyCampaignMetrics(): CampaignMetrics {
  return { totalSpend: 0, totalLeads: 0, cpl: 0, activeCampaigns: 0, avgCtr: 0, avgFrequency: 0, avgHookRate: 0, campaignCount: 0 };
}

interface FunnelMetrics {
  tofCtr: number;
  mofLtr: number;
  bofCvr: number;
  bottleneck: string | null;
}

async function collectFunnelMetrics(
  tenantId: string,
  clientId: string | null | undefined,
  since: Date,
  campaignId?: string | null,
): Promise<FunnelMetrics> {
  try {
    const campWhere: any = { tenantId };
    if (clientId === 'own') campWhere.clientId = null;
    else if (clientId)      campWhere.clientId = clientId;
    if (campaignId)         campWhere.id       = campaignId;

    const campaigns = await prisma.campaign.findMany({
      where: campWhere,
      select: { id: true, funnelStage: true },
    });

    const byStage: Record<string, string[]> = { TOF: [], MOF: [], BOF: [] };
    for (const c of campaigns) {
      const stage = (c as any).funnelStage ?? 'TOF';
      if (byStage[stage]) byStage[stage].push(c.id);
    }

    const aggStage = async (ids: string[]) => {
      if (ids.length === 0) return { impressions: 0, clicks: 0, leads: 0, spend: 0 };
      const agg = await prisma.insight.aggregate({
        where: { campaignId: { in: ids }, date: { gte: since } },
        _sum: { impressions: true, clicks: true, spend: true },
      });
      const leadEvents = await getLeadEvents(tenantId, { campaignIds: ids, startDate: since, endDate: new Date() });
      const leads = sumLeads(leadEvents);
      return {
        impressions: agg._sum.impressions ?? 0,
        clicks: agg._sum.clicks ?? 0,
        leads,
        spend: agg._sum.spend ?? 0,
      };
    };

    const [tof, mof, bof] = await Promise.all([
      aggStage(byStage.TOF),
      aggStage(byStage.MOF),
      aggStage(byStage.BOF),
    ]);

    const tofCtr = tof.impressions > 0 ? (tof.clicks / tof.impressions) * 100 : 0;
    const mofLtr = mof.clicks > 0 ? (mof.leads / mof.clicks) * 100 : 0;
    const bofCvr = bof.leads > 0 ? (bof.leads / Math.max(1, tof.clicks + mof.clicks)) * 100 : 0;

    // bottleneck = estágio com maior budget share mas pior conversão
    const total = tof.spend + mof.spend + bof.spend;
    let bottleneck: string | null = null;
    if (total > 0) {
      const shares = [
        { stage: 'TOF', share: tof.spend / total, rate: tofCtr },
        { stage: 'MOF', share: mof.spend / total, rate: mofLtr },
        { stage: 'BOF', share: bof.spend / total, rate: bofCvr },
      ].filter(s => s.share > 0.1);
      if (shares.length > 0) {
        const worst = shares.reduce((a, b) => (b.rate < a.rate ? b : a));
        bottleneck = worst.stage;
      }
    }

    return { tofCtr, mofLtr, bofCvr, bottleneck };
  } catch {
    return { tofCtr: 0, mofLtr: 0, bofCvr: 0, bottleneck: null };
  }
}

// ─────────────────────────────────────────────────────────────
//  HELPERS — scoring por dimensão
// ─────────────────────────────────────────────────────────────

function scoreDimensionPerformance(
  m: CampaignMetrics,
  b: Record<string, number>,
  bands: AuditBandSet,
): ScorecardDimension {
  let score = singleValue(bands, 'performance', 'base');
  let detail = 'Sem dados suficientes para avaliar performance.';

  if (m.totalSpend > 0) {
    if (m.totalLeads === 0) {
      score = singleValue(bands, 'performance', 'no_leads');
      detail = `Nenhum lead gerado com R$${m.totalSpend.toFixed(0)} investidos.`;
    } else {
      const cplRatio = b.cpl_ideal > 0 ? m.cpl / b.cpl_ideal : 1;
      const band = bandFor(bands, 'performance', 'cpl_ratio', cplRatio);
      score = band.score;
      detail = `${band.label ?? 'CPL'}: R$${m.cpl.toFixed(0)} vs ideal R$${b.cpl_ideal?.toFixed(0) ?? '—'} (${cplRatio.toFixed(1)}×).`;
    }
  }

  return {
    id: 'performance', label: 'Performance', score,
    weight: singleValue(bands, 'performance', 'weight'),
    detail,
    status: statusFor(bands, 'performance', score),
  };
}

function scoreDimensionSpendEfficiency(
  wasted: Awaited<ReturnType<typeof calculateWastedSpend>> | null,
  m: CampaignMetrics,
  bands: AuditBandSet,
): ScorecardDimension {
  let score = singleValue(bands, 'spend_efficiency', 'base');
  let detail = 'Sem dados de desperdício.';

  if (wasted && m.totalSpend > 0) {
    const pct = (wasted.totalWasted / m.totalSpend) * 100;
    const band = bandFor(bands, 'spend_efficiency', 'waste_pct', pct);
    score = band.score;
    detail = `${pct.toFixed(0)}% de desperdício — ${band.label ?? ''} (R$${wasted.totalWasted.toFixed(0)}).`;
  }

  return {
    id: 'spend_efficiency', label: 'Eficiência de Verba', score,
    weight: singleValue(bands, 'spend_efficiency', 'weight'),
    detail,
    status: statusFor(bands, 'spend_efficiency', score),
  };
}

function scoreDimensionFunnel(
  f: FunnelMetrics,
  b: Record<string, number>,
  bands: AuditBandSet,
): ScorecardDimension {
  const ctrMin = b.ctr_min ?? singleValue(bands, 'reference', 'ctr_min');
  let score = singleValue(bands, 'funnel_health', 'base');
  let detail = 'Sem dados de funil suficientes.';

  if (f.tofCtr > 0 || f.mofLtr > 0 || f.bofCvr > 0) {
    // CTR é comparado como razão sobre o mínimo do segmento (ctr ÷ ctr_min).
    const ctrRatio = ctrMin > 0 ? f.tofCtr / ctrMin : (f.tofCtr > 0 ? Infinity : 0);
    const ctrScore = scoreByBands(bands, 'funnel_health', 'ctr_ratio', ctrRatio);
    const ltrScore = scoreByBands(bands, 'funnel_health', 'lead_rate', f.mofLtr);
    const cvrScore = scoreByBands(bands, 'funnel_health', 'conv_rate', f.bofCvr);
    score = Math.round(
      ctrScore * singleValue(bands, 'funnel_health', 'weight_tof')
      + ltrScore * singleValue(bands, 'funnel_health', 'weight_mof')
      + cvrScore * singleValue(bands, 'funnel_health', 'weight_bof'),
    );

    const bottleneckLabel = f.bottleneck === 'TOF' ? `CTR ${f.tofCtr.toFixed(1)}%`
      : f.bottleneck === 'MOF' ? `Lead Rate ${f.mofLtr.toFixed(1)}%`
      : f.bottleneck === 'BOF' ? `Conversão ${f.bofCvr.toFixed(1)}%`
      : '';
    detail = f.bottleneck
      ? `Gargalo em ${f.bottleneck} (${bottleneckLabel}).`
      : `CTR ${f.tofCtr.toFixed(1)}% · Lead Rate ${f.mofLtr.toFixed(1)}% · Conv ${f.bofCvr.toFixed(1)}%.`;
  }

  return {
    id: 'funnel_health', label: 'Saúde do Funil', score,
    weight: singleValue(bands, 'funnel_health', 'weight'),
    detail,
    status: statusFor(bands, 'funnel_health', score),
  };
}

function scoreDimensionTracking(
  health: Awaited<ReturnType<typeof runTrackingHealthCheck>> | null,
  bands: AuditBandSet,
): ScorecardDimension {
  const score = health?.overallScore ?? singleValue(bands, 'tracking', 'fallback');
  const issues = (health?.issues ?? []) as any[];
  const criticalCount = issues.filter((i: any) => i.severity === 'critical').length;

  const detail = criticalCount > 0
    ? `${criticalCount} problema(s) crítico(s) de rastreamento detectado(s).`
    : issues.length > 0
      ? `${issues.length} alerta(s) de rastreamento — score ${score}/100.`
      : `Rastreamento saudável — score ${score}/100.`;

  return {
    id: 'tracking', label: 'Saúde do Rastreamento', score,
    weight: singleValue(bands, 'tracking', 'weight'),
    detail,
    status: statusFor(bands, 'tracking', score),
  };
}

function scoreDimensionCreative(
  m: CampaignMetrics,
  b: Record<string, number>,
  bands: AuditBandSet,
): ScorecardDimension {
  let score = singleValue(bands, 'creative', 'base');
  let detail = 'Sem métricas de criativo disponíveis.';

  if (m.avgFrequency > 0 || m.avgHookRate > 0) {
    const freqRef  = b.frequency_max ?? singleValue(bands, 'reference', 'frequency_max');
    const hookRef  = b.hook_rate_critical ?? singleValue(bands, 'reference', 'hook_rate_critical');

    const freqRatio = freqRef > 0 ? m.avgFrequency / freqRef : (m.avgFrequency > 0 ? Infinity : 0);
    const hookRatio = hookRef > 0 ? m.avgHookRate / hookRef : (m.avgHookRate > 0 ? Infinity : 0);

    const freqScore = scoreByBands(bands, 'creative', 'freq_ratio', freqRatio);
    const hookScore = scoreByBands(bands, 'creative', 'hook_ratio', hookRatio);
    score = Math.round(
      freqScore * singleValue(bands, 'creative', 'weight_freq')
      + hookScore * singleValue(bands, 'creative', 'weight_hook'),
    );

    const parts = [];
    if (m.avgFrequency > 0) parts.push(`Frequência ${m.avgFrequency.toFixed(1)}x`);
    if (m.avgHookRate > 0)  parts.push(`Hook Rate ${m.avgHookRate.toFixed(1)}%`);
    detail = parts.join(' · ') || detail;
  }

  return {
    id: 'creative', label: 'Saúde Criativa', score,
    weight: singleValue(bands, 'creative', 'weight'),
    detail,
    status: statusFor(bands, 'creative', score),
  };
}

// ─────────────────────────────────────────────────────────────
//  HELPERS — problemas, oportunidades, plano
// ─────────────────────────────────────────────────────────────

function buildProblems(
  scorecard: ScorecardDimension[],
  wasted: any,
  m: CampaignMetrics,
  f: FunnelMetrics,
  b: Record<string, number>,
  bands: AuditBandSet,
  texts: Map<string, AuditTextParam>,
  segmentId: string,
): AuditProblem[] {
  const triggerMin = singleValue(bands, 'problem', 'trigger_min');
  const cplCriticalRef = b.cpl_critical ?? singleValue(bands, 'reference', 'cpl_critical');
  const problems: AuditProblem[] = [];
  const dimLimit = textParam(texts, segmentId, 'problem_dimensions').min;
  const maxProblems = textParam(texts, segmentId, 'max_problems').min;

  // Extrair da dimensão com pior score
  const sorted = [...scorecard].sort((a, b) => a.score - b.score);

  for (const dim of sorted.slice(0, dimLimit)) {
    if (problems.length >= maxProblems) break;
    if (dim.status === 'ok') continue;

    if (dim.id === 'performance' && m.totalLeads === 0 && m.totalSpend > 0) {
      problems.push({
        rank: problems.length + 1,
        title: 'Zero leads gerados',
        description: `R$${m.totalSpend.toFixed(0)} investidos sem nenhum lead no período. Revisar segmentação, criativos e objetivo da campanha.`,
        impact: 'high',
        dimensionId: 'performance',
        metric: `R$${m.totalSpend.toFixed(0)} sem retorno`,
      });
    } else if (dim.id === 'performance' && m.cpl >= cplCriticalRef) {
      problems.push({
        rank: problems.length + 1,
        title: 'CPL acima do limite crítico',
        description: `CPL atual de R$${m.cpl.toFixed(0)} supera o limite crítico de R$${cplCriticalRef.toFixed(0)}. Campanha operando no vermelho.`,
        impact: 'high',
        dimensionId: 'performance',
        metric: `CPL R$${m.cpl.toFixed(0)}`,
      });
    } else if (dim.id === 'spend_efficiency' && wasted?.totalWasted > 0) {
      const pct = m.totalSpend > 0 ? (wasted.totalWasted / m.totalSpend * 100).toFixed(0) : '?';
      problems.push({
        rank: problems.length + 1,
        title: 'Desperdício de verba detectado',
        description: `R$${wasted.totalWasted.toFixed(0)} (${pct}% do investimento) em campanhas ineficientes: sem leads, CPL crítico ou público saturado.`,
        impact: wasted.totalWasted > singleValue(bands, 'problem', 'waste_high_brl') ? 'high' : 'medium',
        dimensionId: 'spend_efficiency',
        metric: `R$${wasted.totalWasted.toFixed(0)} desperdiçados`,
      });
    } else if (dim.id === 'funnel_health' && f.bottleneck) {
      const rateLabel = f.bottleneck === 'TOF' ? `CTR ${f.tofCtr.toFixed(1)}%`
        : f.bottleneck === 'MOF' ? `Lead Rate ${f.mofLtr.toFixed(1)}%`
        : `Conv Rate ${f.bofCvr.toFixed(1)}%`;
      problems.push({
        rank: problems.length + 1,
        title: `Gargalo no funil — ${f.bottleneck}`,
        description: `O estágio ${f.bottleneck} concentra budget mas apresenta a pior taxa de conversão (${rateLabel}). Ajustar segmentação ou criativo nesta etapa.`,
        impact: 'medium',
        dimensionId: 'funnel_health',
        metric: rateLabel,
      });
    } else if (dim.id === 'tracking' && dim.score < triggerMin) {
      problems.push({
        rank: problems.length + 1,
        title: 'Falha no tracking de conversões',
        description: `Score de tracking ${dim.score}/100. Dados imprecisos comprometem a otimização automática do Meta e a atribuição de leads.`,
        impact: dim.score < singleValue(bands, 'problem', 'tracking_high_below') ? 'high' : 'medium',
        dimensionId: 'tracking',
        metric: `Score ${dim.score}/100`,
      });
    } else if (dim.id === 'creative' && dim.score < triggerMin) {
      problems.push({
        rank: problems.length + 1,
        title: 'Fadiga criativa detectada',
        description: `${dim.detail} Criativos saturados reduzem o CTR e elevam o CPL ao longo do tempo.`,
        impact: 'medium',
        dimensionId: 'creative',
        metric: dim.detail,
      });
    }
  }

  // Fallback genérico se não encontrou problemas concretos
  if (problems.length === 0) {
    problems.push({
      rank: 1,
      title: 'Sem dados históricos suficientes',
      description: 'O período analisado não possui volume de dados suficiente para diagnósticos precisos. Aguarde ao menos 7 dias de veiculação ativa.',
      impact: 'low',
      dimensionId: 'performance',
    });
  }

  return problems.slice(0, maxProblems);
}

function buildOpportunities(
  scorecard: ScorecardDimension[],
  m: CampaignMetrics,
  f: FunnelMetrics,
  b: Record<string, number>,
  bands: AuditBandSet,
  texts: Map<string, AuditTextParam>,
  segmentId: string,
): AuditOpportunity[] {
  const opps: AuditOpportunity[] = [];
  const leadFactor   = textParam(texts, segmentId, 'lead_gain_factor').min;
  const cplRed       = textParam(texts, segmentId, 'cpl_reduction');
  const trackGain    = textParam(texts, segmentId, 'tracking_gain');
  const scaleGain    = textParam(texts, segmentId, 'scale_gain');
  const llaRange     = textParam(texts, segmentId, 'lla_range');
  const maxOpps      = textParam(texts, segmentId, 'max_opportunities').min;
  const ctrRef  = b.ctr_min ?? singleValue(bands, 'reference', 'ctr_min');
  const ctrGoal = ctrRef * singleValue(bands, 'opportunity', 'ctr_factor');
  const cplIdealRef = b.cpl_ideal ?? singleValue(bands, 'reference', 'cpl_ideal');

  // Oportunidades por dimensão em ordem de impacto potencial
  if (f.tofCtr > 0 && f.tofCtr < ctrGoal) {
    opps.push({
      rank: 1,
      title: 'Dobrar CTR no Topo do Funil',
      description: `CTR atual de ${f.tofCtr.toFixed(1)}%. Testar novos formatos de criativo (vídeo curto, UGC) e hooks mais diretos pode atingir ${ctrGoal.toFixed(1)}%.`,
      potentialGain: `+${Math.round(f.tofCtr * leadFactor)} leads adicionais/mês estimados`,
      dimensionId: 'funnel_health',
    });
  }

  if (m.cpl > 0 && m.cpl > cplIdealRef) {
    const saving = (m.cpl - cplIdealRef) * m.totalLeads;
    opps.push({
      rank: opps.length + 1,
      title: 'Reduzir CPL ao nível ideal',
      description: `CPL atual R$${m.cpl.toFixed(0)} vs ideal R$${cplIdealRef.toFixed(0)}. Otimização de lances + segmentação LLA pode recuperar eficiência.`,
      potentialGain: `Economia estimada R$${saving.toFixed(0)}/mês`,
      // (mesmo cálculo; a estimativa aqui é o valor exato, não um intervalo)
      dimensionId: 'performance',
    });
  }

  if (f.mofLtr === 0 && m.totalLeads > 0) {
    opps.push({
      rank: opps.length + 1,
      title: 'Ativar Meio do Funil (MOF)',
      description: 'Nenhuma campanha de engajamento ativa. Campanhas MOF nutrem leads quentes e reduzem CPL nas campanhas BOF.',
      potentialGain: `Redução estimada de ${formatRange(cplRed)}% no CPL médio`,
      dimensionId: 'funnel_health',
    });
  }

  const trackingDim = scorecard.find(d => d.id === 'tracking');
  if (trackingDim && trackingDim.score < singleValue(bands, 'opportunity', 'tracking_below')) {
    opps.push({
      rank: opps.length + 1,
      title: 'Melhorar qualidade do tracking',
      description: `Score ${trackingDim.score}/100. Corrigir configurações de pixel e Conversions API melhora a otimização automática do Meta.`,
      potentialGain: `${formatRange(trackGain)}% de eficiência de campanha com dados limpos`,
      dimensionId: 'tracking',
    });
  }

  if (opps.length < maxOpps) {
    opps.push({
      rank: opps.length + 1,
      title: 'Expandir para novas audiências',
      description: `Com performance saudável, testar Lookalike Audiences (LLA ${formatRange(llaRange)}%) dos leads existentes para escalar o volume sem elevar CPL.`,
      potentialGain: `Escala de +${formatRange(scaleGain)}% de leads mantendo CPL`,
      dimensionId: 'performance',
    });
  }

  return opps.slice(0, maxOpps);
}

function buildActionPlan(
  problems: AuditProblem[],
  opps: AuditOpportunity[],
  wasted: any,
): ActionItem[] {
  const plan: ActionItem[] = [];

  // Semana 1: resolver o problema mais crítico
  const critical = problems.find(p => p.impact === 'high');
  if (critical) {
    plan.push({
      week: 1,
      priority: 'urgent',
      action: `Resolver "${critical.title}": ${critical.description.split('.')[0]}.`,
      owner: 'gestor',
    });
  }

  // Semana 1-2: desperdício
  if (wasted?.totalWasted > 100) {
    plan.push({
      week: 1,
      priority: 'high',
      action: `Pausar campanhas com desperdício identificado e redistribuir R$${wasted.totalWasted.toFixed(0)} para campanhas saudáveis.`,
      owner: 'agência',
    });
  }

  // Semana 2: primeira oportunidade
  if (opps[0]) {
    plan.push({
      week: 2,
      priority: 'high',
      action: `Oportunidade: ${opps[0].title} — ${opps[0].description.split('.')[0]}.`,
      owner: 'agência',
    });
  }

  // Semana 3: segundo problema médio
  const medium = problems.find(p => p.impact === 'medium');
  if (medium) {
    plan.push({
      week: 3,
      priority: 'medium',
      action: `Atacar "${medium.title}" — ${medium.description.split('.')[0]}.`,
      owner: 'gestor',
    });
  }

  // Semana 4: segunda oportunidade
  if (opps[1]) {
    plan.push({
      week: 4,
      priority: 'medium',
      action: `Implementar: ${opps[1].title} — ${opps[1].description.split('.')[0]}.`,
      owner: 'agência',
    });
  }

  if (plan.length === 0) {
    plan.push({
      week: 1,
      priority: 'medium',
      action: 'Manter monitoramento semanal e coletar mais dados para análise aprofundada.',
      owner: 'sistema',
    });
  }

  return plan;
}

function buildWastedSpendSummary(wasted: any, perCategoryTop: number, totalTop: number) {
  if (!wasted) {
    return { total: 0, byCategory: {}, topCampaigns: [] };
  }

  const byCategory: Record<string, number> = {};
  const topCampaigns: Array<{ name: string; amount: number; reason: string }> = [];

  for (const [key, cat] of Object.entries(wasted.byCategory ?? {})) {
    const c = cat as any;
    byCategory[key] = c.amount ?? 0;
    for (const camp of (c.campaigns ?? []).slice(0, perCategoryTop)) {
      topCampaigns.push({ name: camp.name, amount: camp.wasted, reason: camp.details });
    }
  }

  // Ordena por valor desperdiçado e mantém o total configurado por segmento
  topCampaigns.sort((a, b) => b.amount - a.amount);

  return {
    total: wasted.totalWasted ?? 0,
    byCategory,
    topCampaigns: topCampaigns.slice(0, totalTop),
  };
}

// ─────────────────────────────────────────────────────────────
//  NARRATIVA LLM
// ─────────────────────────────────────────────────────────────

async function generateNarrative(
  tenantId: string,
  clientId: string | null | undefined,
  periodDays: number,
  overallScore: number,
  scorecard: ScorecardDimension[],
  problems: AuditProblem[],
  opps: AuditOpportunity[],
  wastedTotal: number,
  actionPlan: ActionItem[],
  startDate: Date,
  endDate: Date,
): Promise<string> {
  const templateKey = periodDays <= 7 ? 'audit_report_weekly' : 'audit_report_monthly';

  const scorecardText = scorecard
    .map(d => `• ${d.label}: ${d.score}/100 — ${d.detail}`)
    .join('\n');
  const problemsText = problems
    .map(p => `${p.rank}. [${p.impact.toUpperCase()}] ${p.title}: ${p.description}`)
    .join('\n');
  const oppsText = opps
    .map(o => `${o.rank}. ${o.title} → ${o.potentialGain}`)
    .join('\n');
  const actionText = actionPlan
    .map(a => `Semana ${a.week} [${a.priority}]: ${a.action}`)
    .join('\n');
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR');

  return invokeForContext({
    templateKey,
    tenantId,
    clientId: clientId ?? null,
    variables: {
      period:        `${fmt(startDate)} a ${fmt(endDate)}`,
      overall_score: String(overallScore),
      scorecard:     scorecardText,
      problems:      problemsText,
      opportunities: oppsText,
      wasted_total:  `R$${wastedTotal.toFixed(0)}`,
      action_plan:   actionText,
    },
    maxTokens: 400,
  });
}

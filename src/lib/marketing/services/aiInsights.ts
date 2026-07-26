import prisma from '../prisma';
import pool from '@/lib/database/connection';
import { resolveBenchmarks, BenchmarkMap } from '../../intelligence/benchmarkResolver';
import { computeSignalsForCampaign, type NormalizedSignals } from './signalEngine';
import { resolveCampaignIdsBySegment } from '../segmentUtils';
import { filterCampaignsByNetwork } from '../networkFilterUtils';
import { getLeadEvents, sumLeads } from './leadEvents';

const S = 'campanhasmarketingdigital';

/**
 * Mapeia cada campanha ao seu segmento efetivo:
 *   campanha de cliente → clientes.segment_id
 *   campanha própria (client_id NULL) → tenants.segment_id
 * Retorna Map<campaignId, { segmentId, segmentName }>.
 */
async function mapCampaignSegments(
  campaignIds: string[],
  tenantId: string,
): Promise<Map<string, { segmentId: string | null; segmentName: string }>> {
  const result = new Map<string, { segmentId: string | null; segmentName: string }>();
  if (campaignIds.length === 0) return result;
  try {
    const { rows } = await pool.query(
      `SELECT cam.id AS campaign_id,
              COALESCE(cl.segment_id, t.segment_id) AS segment_id,
              s.name AS segment_name
       FROM ${S}."Campaign" cam
       LEFT JOIN public.clientes cl ON cl.uuid = cam.client_id
       LEFT JOIN public.tenants  t  ON t.id    = cam.tenant_id
       LEFT JOIN public.system_segments s ON s.id = COALESCE(cl.segment_id, t.segment_id)
       WHERE cam.id = ANY($1::text[]) AND cam.tenant_id = $2::uuid`,
      [campaignIds, tenantId],
    );
    for (const r of rows) {
      result.set(r.campaign_id, {
        segmentId:   r.segment_id ?? null,
        segmentName: r.segment_name ?? 'Sem segmento',
      });
    }
  } catch (err) {
    console.warn('[aiInsights] mapCampaignSegments falhou:', err);
  }
  return result;
}

// Sem DEFAULT_BENCHMARKS hardcoded — todos os valores vêm de system_benchmarks por segmento.
// Se um segmento não tiver uma chave configurada, benchmarkResolver loga o erro e retorna 0.

const BENCHMARK_KEYS = [
  'cpl_ideal', 'cpl_critical', 'ctr_min', 'ctr_scale', 'frequency_max', 'spend_no_lead',
  'min_leads_scale', 'min_days_running', 'hook_rate_critical', 'hook_rate_min',
  'scale_budget_pct', 'downscale_budget_pct',
  // Cálculo proporcional de escala (substituem scale_budget_pct quando configurados)
  'scale_budget_base_pct', 'scale_budget_max_pct', 'scale_ratio_cap',
  // FASE 1 (Google Ads) — regra IMPRESSION_SHARE_OPPORTUNITY
  'is_lost_budget_scale_min',
];

/**
 * Calcula o % de escala de budget proporcional à performance da campanha.
 * Quanto mais acima do threshold de CTR, maior o %; capped em scale_budget_max_pct.
 * Fallback: scale_budget_pct (fixo) se as novas chaves não estiverem configuradas.
 */
function computeScalePct(actualCtr: number, b: BenchmarkMap): number {
  const basePct  = b.scale_budget_base_pct ?? null;
  if (basePct == null) return b.scale_budget_pct ?? 20;   // fallback legado

  const maxPct   = b.scale_budget_max_pct ?? 25;
  const ratioCap = b.scale_ratio_cap ?? 3.0;
  const threshold = b.ctr_scale || 1;

  const ctrRatio = actualCtr / threshold;
  // Interpola linearmente de basePct (= threshold) até maxPct (= ratioCap × threshold)
  const t = Math.min(Math.max((ctrRatio - 1) / (ratioCap - 1), 0), 1);
  return Math.round(basePct + (maxPct - basePct) * t);
}

interface CampaignData {
  campaignId: string;
  campaignName: string;
  insights: any[];
  leads: number;
  totalSpend: number;
  avgCtr: number;
  avgCpc: number;
  avgFrequency: number;
  trend: 'up' | 'down' | 'stable';
  daysRunning: number;
  // FASE 5 — Video Metrics
  hasVideoMetrics: boolean;
  avgHookRate: number;  // video_views_3s / impressions * 100
  // FASE 1 (Google Ads) — Impression Share (só > 0 em campanhas Google Search)
  avgSearchImpressionShare: number;
  avgSearchBudgetLostIs: number;
}

interface InsightRule {
  check: (data: CampaignData, b: BenchmarkMap) => boolean;
  type: string;
  title: string;
  description: (data: CampaignData, b: BenchmarkMap) => string;
  confidence: (data: CampaignData, b: BenchmarkMap) => number;
}

// Predicado compartilhado entre a regra de SCALE genérica e a de DOWNSCALE — sem isso, uma
// campanha com volume/CTR bons mas CPL crítico (ex.: Google com muitas "conversões" agregadas
// que não são lead de verdade, ver aviso de Insight.conversions na UI) recebia os dois cards ao
// mesmo tempo ("aumente o orçamento" + "reduza o orçamento" pra mesma campanha).
function isCplCritical(d: CampaignData, b: BenchmarkMap): boolean {
  return (
    d.leads > 0 &&
    d.totalSpend > 0 &&
    (d.totalSpend / d.leads) > b.cpl_ideal * 2.5 &&
    d.totalSpend > b.spend_no_lead * 0.4 &&
    d.daysRunning >= b.min_days_running
  );
}

const RULES: InsightRule[] = [
  {
    check: (d, b) => d.avgCtr < b.ctr_min && d.daysRunning >= b.min_days_running,
    type: 'PAUSE',
    title: 'CTR muito baixo',
    description: (d, b) =>
      `Campanha "${d.campaignName}" tem CTR ${d.avgCtr.toFixed(2)}% (mínimo: ${b.ctr_min}%) nos últimos ${d.daysRunning} dias. Considere pausar e trocar o criativo ou ajustar o público.`,
    confidence: (d, b) => Math.min(0.9, 0.6 + (d.daysRunning - b.min_days_running) * 0.1),
  },
  {
    check: (d, b) => d.avgFrequency > b.frequency_max,
    type: 'ALERT',
    title: 'Fadiga de anúncio detectada',
    description: (d, b) =>
      `Frequência ${d.avgFrequency.toFixed(1)}x na campanha "${d.campaignName}" (máximo: ${b.frequency_max}x). O público está vendo o anúncio muitas vezes. Expanda o público ou renove os criativos.`,
    confidence: (d, b) => Math.min(0.95, 0.7 + (d.avgFrequency - b.frequency_max) * 0.05),
  },
  {
    check: (d, b) => d.trend === 'up' && d.avgCpc > 0 && d.daysRunning >= b.min_days_running,
    type: 'ALERT',
    title: 'CPC em tendência de alta',
    description: (d) =>
      `O CPC da campanha "${d.campaignName}" está subindo. CPC atual: R$${d.avgCpc.toFixed(2)}. Possível saturação do público-alvo.`,
    confidence: () => 0.7,
  },
  {
    check: (d, b) => d.totalSpend > b.spend_no_lead && d.leads === 0 && d.daysRunning >= b.min_days_running,
    type: 'PAUSE',
    title: 'Gasto sem resultados',
    description: (d, b) =>
      `A campanha "${d.campaignName}" gastou R$${d.totalSpend.toFixed(2)} (limite: R$${b.spend_no_lead}) sem gerar nenhum lead. Recomendamos pausar e reavaliar.`,
    confidence: (d, b) => Math.min(0.95, 0.75 + d.totalSpend / (b.spend_no_lead * 10)),
  },
  {
    check: (d, b) => d.leads >= b.min_leads_scale && d.avgCtr >= b.ctr_scale && !isCplCritical(d, b),
    type: 'SCALE',
    title: 'Campanha com bom desempenho',
    description: (d, b) =>
      `A campanha "${d.campaignName}" tem CTR ${d.avgCtr.toFixed(2)}% e gerou ${d.leads} leads (mínimo: ${b.min_leads_scale}). Considere aumentar o orçamento diário para escalar resultados.`,
    confidence: (d) => Math.min(0.9, 0.6 + d.leads * 0.02),
  },
  {
    check: (d, b) => d.leads > 0 && d.totalSpend > 0 && d.totalSpend / d.leads > b.cpl_ideal,
    type: 'OPTIMIZE',
    title: 'CPL acima do ideal',
    description: (d, b) => {
      const cpl = d.totalSpend / d.leads;
      return `O CPL da campanha "${d.campaignName}" é R$${cpl.toFixed(2)} (ideal: R$${b.cpl_ideal}). Tente segmentar melhor o público ou testar novos criativos.`;
    },
    confidence: () => 0.75,
  },
  // FASE 5 — Hook Rate fraco (só dispara para campanhas com vídeo)
  {
    check: (d, b) => d.hasVideoMetrics && d.avgHookRate > 0 && d.avgHookRate < (b.hook_rate_min ?? 12),
    type: 'ALERT',
    title: 'Hook Rate fraco',
    description: (d, b) => {
      const isCritical = d.avgHookRate < (b.hook_rate_critical ?? 8);
      return isCritical
        ? `Hook Rate ${d.avgHookRate.toFixed(1)}% na campanha "${d.campaignName}" está CRÍTICO (mínimo: ${b.hook_rate_critical ?? 8}%). O vídeo não está retendo atenção — considere pausar e regravar a abertura.`
        : `Hook Rate ${d.avgHookRate.toFixed(1)}% na campanha "${d.campaignName}" está abaixo do esperado (ideal: ${b.hook_rate_min ?? 12}%). Revise os primeiros 3 segundos do vídeo.`;
    },
    confidence: (d, b) => {
      const gap = (b.hook_rate_min ?? 12) - d.avgHookRate;
      return Math.min(0.95, 0.6 + gap * 0.03);
    },
  },
  // FASE 15 — DOWNSCALE: CPL crítico (>2.5× o ideal) com gasto relevante → defensivo, auto-executa
  {
    check: (d, b) => isCplCritical(d, b),
    type: 'DOWNSCALE',
    title: 'CPL crítico — reduzir orçamento',
    description: (d, b) => {
      const cpl = d.totalSpend / d.leads;
      const pct = b.downscale_budget_pct ?? 30;
      return `CPL R$${cpl.toFixed(2)} (${(cpl / b.cpl_ideal).toFixed(1)}× o ideal de R$${b.cpl_ideal}) na campanha "${d.campaignName}". Budget reduzido ${pct}% para conter sangria enquanto o criativo é revisado.`;
    },
    confidence: (d, b) => {
      const cpl = d.totalSpend / d.leads;
      const ratio = cpl / (b.cpl_ideal * 2.5);
      return Math.min(0.93, 0.72 + (ratio - 1) * 0.08);
    },
  },
  // FASE 15 — REFRESH_CREATIVE: fadiga crítica (>1.3× o máximo de frequência) → exige aprovação
  {
    check: (d, b) =>
      d.avgFrequency > b.frequency_max * 1.3 &&
      d.totalSpend > b.spend_no_lead * 0.3 &&
      d.daysRunning >= b.min_days_running,
    type: 'REFRESH_CREATIVE',
    title: 'Fadiga crítica — trocar criativo urgente',
    description: (d, b) => {
      const ratio = (d.avgFrequency / b.frequency_max).toFixed(1);
      return `Frequência ${d.avgFrequency.toFixed(1)}× (${ratio}× o máximo de ${b.frequency_max}×) na campanha "${d.campaignName}". CTR em queda por saturação — troque o criativo imediatamente para recuperar engajamento.`;
    },
    confidence: (d, b) => Math.min(0.93, 0.68 + (d.avgFrequency - b.frequency_max * 1.3) * 0.06),
  },
  // FASE 15 — ADJUST_AUDIENCE: CTR muito baixo + poucos leads + gasto relevante → exige aprovação
  {
    check: (d, b) =>
      d.avgCtr < b.ctr_min * 0.6 &&
      d.totalSpend > b.spend_no_lead * 0.35 &&
      d.leads < 3 &&
      d.daysRunning >= b.min_days_running,
    type: 'ADJUST_AUDIENCE',
    title: 'Público desalinhado — rever segmentação',
    description: (d, b) =>
      `CTR ${d.avgCtr.toFixed(2)}% (abaixo de ${b.ctr_min}%) com ${d.leads} lead(s) em R$${d.totalSpend.toFixed(0)} na campanha "${d.campaignName}". O público pode não corresponder ao criativo — ajuste a segmentação ou expanda a audiência.`,
    confidence: (d, b) => {
      const gap = b.ctr_min - d.avgCtr;
      return Math.min(0.88, 0.62 + gap * 0.08);
    },
  },
  // FASE 1 (Google Ads) A6 — IMPRESSION_SHARE_OPPORTUNITY: IS perdido por orçamento alto
  // + CPL já bom → oportunidade real de aumentar verba (só dispara em campanhas Google Search,
  // que são as únicas com search_impression_share > 0; Meta sempre fica em 0/default).
  {
    check: (d, b) =>
      d.avgSearchImpressionShare > 0 &&
      d.avgSearchBudgetLostIs > (b.is_lost_budget_scale_min ?? 20) &&
      d.leads > 0 &&
      d.totalSpend > 0 &&
      (d.totalSpend / d.leads) < b.cpl_ideal,
    type: 'SCALE',
    title: 'Impression Share perdido por orçamento — oportunidade de escalar',
    description: (d, b) => {
      const cpl = d.totalSpend / d.leads;
      return `A campanha "${d.campaignName}" está perdendo ${d.avgSearchBudgetLostIs.toFixed(1)}% de Impression Share por falta de orçamento (limite: ${b.is_lost_budget_scale_min ?? 20}%), com CPL R$${cpl.toFixed(2)} já abaixo do ideal (R$${b.cpl_ideal}). Aumentar o orçamento tende a trazer mais leads no mesmo CPL.`;
    },
    confidence: (d, b) => {
      const gap = d.avgSearchBudgetLostIs - (b.is_lost_budget_scale_min ?? 20);
      return Math.min(0.9, 0.65 + gap * 0.01);
    },
  },
];

/* ──────────────────────────────────────────────────────────────
   FASE 8.5 — CalibrationAction (ações leading acionáveis)
────────────────────────────────────────────────────────────── */

export type CalibrationAction =
  | { action: 'HOLD_BUDGET';     reason: string; confidence: number; pressureScore: number }
  | { action: 'SWAP_CREATIVE';   creativeDimension: 'HOOK' | 'VISUAL' | 'OFFER'; reason: string; confidence: number; pressureScore: number }
  | { action: 'EXPAND_AUDIENCE'; reason: string; confidence: number; pressureScore: number }
  | { action: 'SHIFT_BUDGET';    target: 'placement' | 'age' | 'time'; reason: string; confidence: number; pressureScore: number }
  | { action: 'REVIEW_OFFER';    reason: string; confidence: number; pressureScore: number }
  | { action: 'SCALE';           reason: string; confidence: number; pressureScore: number };

interface SignalRule {
  id: string;
  check: (s: NormalizedSignals) => boolean;
  buildAction: (s: NormalizedSignals, campaignName: string) => CalibrationAction;
}

const SIGNAL_RULES: SignalRule[] = [
  {
    id: 'learning_hold',
    check: s => s.learningStatus === 'LEARNING' || s.learningStatus === 'LEARNING_LIMITED',
    buildAction: (s, name) => ({
      action: 'HOLD_BUDGET',
      reason: `"${name}" está em fase de aprendizado do Meta (${s.learningStatus}). Alterações de budget interrompem o aprendizado — aguarde estabilização.`,
      confidence: 0.92,
      pressureScore: s.pressureScore,
    }),
  },
  {
    id: 'engagement_ranking_weak',
    check: s => ['below_average_10','below_average_20','below_average_35'].includes(s.engagementRanking ?? ''),
    buildAction: (s, name) => ({
      action: 'SWAP_CREATIVE',
      creativeDimension: 'HOOK',
      reason: `Meta classifica o engajamento de "${name}" como "${s.engagementRanking}" vs. concorrentes. O gancho está retendo menos que os rivais que disputam o mesmo público.`,
      confidence: s.engagementRanking === 'below_average_10' ? 0.93 : s.engagementRanking === 'below_average_20' ? 0.85 : 0.75,
      pressureScore: s.pressureScore,
    }),
  },
  {
    id: 'conversion_ranking_weak',
    check: s => ['below_average_10','below_average_20'].includes(s.conversionRanking ?? ''),
    buildAction: (s, name) => ({
      action: 'REVIEW_OFFER',
      reason: `Meta classifica a conversão de "${name}" como "${s.conversionRanking}" vs. concorrentes. O tráfego chega, mas a oferta ou landing page converte pior que a vizinhança.`,
      confidence: s.conversionRanking === 'below_average_10' ? 0.90 : 0.80,
      pressureScore: s.pressureScore,
    }),
  },
  {
    id: 'audience_saturation',
    check: s => s.cpmDeltaPct > 0.20 && s.frequencyNow > 3.5,
    buildAction: (s, name) => ({
      action: 'EXPAND_AUDIENCE',
      reason: `"${name}": CPM subiu ${(s.cpmDeltaPct * 100).toFixed(0)}% (concorrência/demanda crescendo) e frequência ${s.frequencyNow.toFixed(1)}x. Combinação indica saturação — amplie o público.`,
      confidence: 0.82,
      pressureScore: s.pressureScore,
    }),
  },
  {
    id: 'all_green_scale',
    check: s => s.qualityRanking === 'above_average'
              && s.engagementRanking !== 'below_average_10'
              && s.cpmDeltaPct < 0.10
              && s.frequencyNow < 3.0,
    buildAction: (s, name) => ({
      action: 'SCALE',
      reason: `"${name}": quality_ranking acima da média, CPM estável e frequência saudável (${s.frequencyNow.toFixed(1)}x). Sinais do Meta favoráveis — pode escalar budget com baixo risco.`,
      confidence: 0.80,
      pressureScore: s.pressureScore,
    }),
  },
];

function calculateTrend(insights: any[]): 'up' | 'down' | 'stable' {
  if (insights.length < 4) return 'stable';
  const mid = Math.floor(insights.length / 2);
  const recent = insights.slice(0, mid);
  const older = insights.slice(mid);
  const recentAvg = recent.reduce((s: number, i: any) => s + (i.cpc || 0), 0) / recent.length;
  const olderAvg = older.reduce((s: number, i: any) => s + (i.cpc || 0), 0) / older.length;
  if (recentAvg > olderAvg * 1.15) return 'up';
  if (recentAvg < olderAvg * 0.85) return 'down';
  return 'stable';
}

interface AiInsightFilters {
  objectiveFilter?: string;
  statusFilter?: string;
  adSetId?: string;
  startDate?: string;
  endDate?: string;
  segmentId?: string;
  // PARTE D1 (correção) — código de rede (meta/google/tiktok...)
  network?: string;
}

export async function generateAiInsights(
  campaignId?: string,
  tenantId?: string,
  clientId?: string,
  filters?: AiInsightFilters,
) {
  const where: any = {};
  if (campaignId) where.id = campaignId;
  if (tenantId)   where.tenantId = tenantId;
  if (filters?.objectiveFilter) where.objective = filters.objectiveFilter;
  if (filters?.statusFilter)    where.status    = filters.statusFilter;
  if (filters?.adSetId)         where.adSets    = { some: { id: filters.adSetId } };

  // Isolamento de segmento — tem precedência sobre clientId
  if (filters?.segmentId && tenantId) {
    const segmentCampaignIds = await resolveCampaignIdsBySegment(
      tenantId,
      filters.segmentId,
      clientId,
    );
    where.id = { in: segmentCampaignIds };
  } else if (clientId === 'own') {
    where.clientId = null;
  } else if (clientId) {
    where.clientId = clientId;
  }

  let campaigns = await prisma.campaign.findMany({ where });
  // PARTE D1 (correção) — sem isso, Insights da IA / Actionable Alerts continuavam citando
  // campanha de outra rede mesmo com o filtro do dashboard ativo (ex.: Google com "Meta"
  // selecionado) — pior que incompleto, era enganoso.
  campaigns = await filterCampaignsByNetwork(campaigns as any, filters?.network);

  // FASE 18.2 — Benchmarks POR SEGMENTO (nunca aplicar 1 segmento a todos).
  // Mapeia cada campanha ao seu segmento e resolve benchmarks por segmento.
  const campaignSegments = tenantId
    ? await mapCampaignSegments(campaigns.map(c => c.id), tenantId)
    : new Map<string, { segmentId: string | null; segmentName: string }>();

  const benchmarksBySegment = new Map<string, BenchmarkMap>();
  if (tenantId) {
    const uniqueSegmentIds = Array.from(
      new Set(Array.from(campaignSegments.values()).map(v => v.segmentId).filter(Boolean) as string[]),
    );
    await Promise.all(uniqueSegmentIds.map(async segId => {
      const bm = await resolveBenchmarks(BENCHMARK_KEYS, tenantId, segId, clientId).catch((err) => {
        console.error('[aiInsights] resolveBenchmarks falhou para segment', segId, err);
        return {} as BenchmarkMap;
      });
      benchmarksBySegment.set(segId, bm);
    }));
  }

  function benchmarksFor(campaignId: string): BenchmarkMap {
    const seg = campaignSegments.get(campaignId);
    if (seg?.segmentId && benchmarksBySegment.has(seg.segmentId)) {
      return benchmarksBySegment.get(seg.segmentId)!;
    }
    // Segmento não mapeado ou não configurado — retorna vazio; as regras usarão valor 0
    // e o benchmarkResolver já logou o erro. Configure via /admin/master/segments → Parâmetros.
    return {} as BenchmarkMap;
  }

  const allInsights: any[] = [];
  const allCalibrationActions: (CalibrationAction & { campaignId: string; campaignName: string })[] = [];

  for (const campaign of campaigns) {
    const benchmarks = benchmarksFor(campaign.id);
    const campSeg    = campaignSegments.get(campaign.id);
    const segTag     = { segmentId: campSeg?.segmentId ?? null, segmentName: campSeg?.segmentName ?? 'Sem segmento' };
    const insightWhere: any = { campaignId: campaign.id };
    if (tenantId) insightWhere.tenantId = tenantId;
    if (filters?.startDate || filters?.endDate) {
      insightWhere.date = {};
      if (filters.startDate) insightWhere.date.gte = new Date(filters.startDate);
      if (filters.endDate)   insightWhere.date.lte = new Date(filters.endDate);
    }

    const insights = await prisma.insight.findMany({
      where: insightWhere,
      orderBy: { date: 'desc' },
      take: 14,
    });

    // Fonte única de lead (WhatsApp + formulário + conversão real do Google) — antes só contava
    // WHATSAPP_CLICK, o que fazia campanha de Google/formulário parecer "sem lead" pras regras
    // abaixo (ex.: recomendar PAUSE numa campanha que na verdade está gerando lead real).
    const leadDateFrom = filters?.startDate ? new Date(filters.startDate) : new Date(0);
    const leadDateTo   = filters?.endDate   ? new Date(filters.endDate)   : new Date();
    const leadEvents = tenantId
      ? await getLeadEvents(tenantId, { campaignIds: [campaign.id], startDate: leadDateFrom, endDate: leadDateTo })
      : [];
    const leads = sumLeads(leadEvents);

    if (insights.length === 0) continue;

    const totalSpend       = insights.reduce((s, i) => s + i.spend, 0);
    const totalImpressions = insights.reduce((s, i) => s + i.impressions, 0);
    const totalClicks      = insights.reduce((s, i) => s + i.clicks, 0);
    const avgFrequency     = insights.reduce((s, i) => s + (i.frequency || 0), 0) / insights.length;

    // FASE 5 — Video Metrics
    const totalVideoViews3s = insights.reduce((s, i) => s + (i.videoViews3s || 0), 0);
    const hasVideoMetrics   = totalVideoViews3s > 0;
    const avgHookRate       = hasVideoMetrics && totalImpressions > 0
      ? (totalVideoViews3s / totalImpressions) * 100
      : 0;

    // FASE 1 (Google Ads) — só > 0 em campanhas Search reais (0 é o default de campanhas Meta)
    const avgSearchImpressionShare = insights.reduce((s, i) => s + (i.searchImpressionShare || 0), 0) / insights.length;
    const avgSearchBudgetLostIs    = insights.reduce((s, i) => s + (i.searchBudgetLostIs    || 0), 0) / insights.length;

    const data: CampaignData = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      insights,
      leads,
      totalSpend,
      avgCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0,
      avgCpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
      avgFrequency,
      trend: calculateTrend(insights),
      daysRunning: insights.length,
      hasVideoMetrics,
      avgHookRate,
      avgSearchImpressionShare,
      avgSearchBudgetLostIs,
    };

    // Lagging rules (FASE 5 e anteriores)
    for (const rule of RULES) {
      if (rule.check(data, benchmarks)) {
        const insight: any = {
          campaignId: campaign.id,
          campaignName: campaign.name,
          type: rule.type,
          title: rule.title,
          description: rule.description(data, benchmarks),
          confidence: rule.confidence(data, benchmarks),
          ...segTag,
        };
        // Para SCALE: calcula % proporcional à performance real (não fixo)
        if (rule.type === 'SCALE') {
          insight.scalePct = computeScalePct(data.avgCtr, benchmarks);
        }
        allInsights.push(insight);
      }
    }

    // FASE 8.5 — Leading signal rules (gracioso: não interrompe se falhar)
    if (tenantId) {
      try {
        const signals = await computeSignalsForCampaign(
          campaign.id, tenantId, clientId ?? null,
        );
        for (const rule of SIGNAL_RULES) {
          if (rule.check(signals)) {
            const action = rule.buildAction(signals, campaign.name);
            allCalibrationActions.push({
              ...action,
              campaignId:   campaign.id,
              campaignName: campaign.name,
              ...segTag,
            });
            // Também adicionar ao allInsights para retrocompatibilidade da UI
            allInsights.push({
              campaignId:   campaign.id,
              campaignName: campaign.name,
              type:         action.action,
              title:        actionTitle(action),
              description:  action.reason,
              confidence:   action.confidence,
              isLeading:    true,
              pressureScore: signals.pressureScore,
              ...segTag,
            });
          }
        }
      } catch (err) {
        // Sinais leading são opcionais — não interrompe o fluxo lagging
        console.warn('[aiInsights] Erro ao computar sinais leading:', err);
      }
    }
  }

  const sortedInsights = allInsights.sort((a, b) => b.confidence - a.confidence);
  const sortedActions  = allCalibrationActions.sort((a, b) => b.confidence - a.confidence);

  // FASE 18.2 — agrupamento por segmento (UI segrega multi-segmento)
  const segIndex = new Map<string, { segmentId: string | null; segmentName: string; insights: any[]; calibrationActions: any[] }>();
  const keyOf = (segId: string | null, name: string) => `${segId ?? 'none'}::${name}`;
  for (const ins of sortedInsights) {
    const k = keyOf(ins.segmentId ?? null, ins.segmentName ?? 'Sem segmento');
    if (!segIndex.has(k)) segIndex.set(k, { segmentId: ins.segmentId ?? null, segmentName: ins.segmentName ?? 'Sem segmento', insights: [], calibrationActions: [] });
    segIndex.get(k)!.insights.push(ins);
  }
  for (const act of sortedActions) {
    const k = keyOf((act as any).segmentId ?? null, (act as any).segmentName ?? 'Sem segmento');
    if (!segIndex.has(k)) segIndex.set(k, { segmentId: (act as any).segmentId ?? null, segmentName: (act as any).segmentName ?? 'Sem segmento', insights: [], calibrationActions: [] });
    segIndex.get(k)!.calibrationActions.push(act);
  }
  const bySegment = Array.from(segIndex.values())
    .sort((a, b) => a.segmentName.localeCompare(b.segmentName));

  return {
    insights: sortedInsights,                 // plano (retrocompat)
    calibrationActions: sortedActions,        // plano (retrocompat)
    bySegment,                                // agrupado por segmento (FASE 18.2)
  };
}

function actionTitle(a: CalibrationAction): string {
  switch (a.action) {
    case 'HOLD_BUDGET':     return '⏸ Segure o Budget (Learning)';
    case 'SWAP_CREATIVE':   return `🔄 Trocar Criativo (${a.creativeDimension === 'HOOK' ? 'Gancho' : a.creativeDimension === 'VISUAL' ? 'Visual' : 'Oferta'})`;
    case 'EXPAND_AUDIENCE': return '🔭 Expandir Público';
    case 'SHIFT_BUDGET':    return '↗ Realocar Budget';
    case 'REVIEW_OFFER':    return '📋 Revisar Oferta / Landing Page';
    case 'SCALE':           return '🚀 Escalar Budget';
  }
}

/**
 * Catálogo de Métricas Dinâmico — Fase 1 (ver docs/CHECKPOINT.md "Tarefa em andamento",
 * 2026-11-02). Metadado de métrica por segmento, curado pelo Master, substituindo aos poucos
 * o conjunto fixo de colunas em campanhasmarketingdigital."Insight".
 */

import pool from '@/lib/database/connection';

const S = 'campanhasmarketingdigital';

export type MetricUnit = 'currency' | 'percent' | 'count' | 'ratio' | 'score';
export type MetricDirection = 'higher_is_better' | 'lower_is_better' | 'neutral';
export type MetricChartType = 'area' | 'line' | 'bar';
export type MetricCategory = 'desempenho' | 'diagnostico' | 'engajamento' | 'conversoes' | 'configuracoes';

export interface SegmentMetric {
  metricKey: string;
  metaField: string;
  label: string;
  unit: MetricUnit;
  betterDirection: MetricDirection;
  chartType: MetricChartType;
  category: MetricCategory;
  benchmarkKey: string | null;
  /** Só relevante quando metaField é 'actions'/'action_values'/'cost_per_action_type' —
   * filtra o array pelo action_type real da Meta (ex.: 'onsite_conversion.lead_grouped').
   * NULL quando metaField já é um campo simples/plano. */
  actionType: string | null;
  isKpiCard: boolean;
  sortOrder: number;
  isActive: boolean;
}

function slugifyKey(raw: string): string {
  return raw
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 100);
}

/** Lista as métricas curadas (ativas) de um segmento, já ordenadas. */
export async function getSegmentMetrics(segmentId: string): Promise<SegmentMetric[]> {
  const { rows } = await pool.query(
    `SELECT metric_key, meta_field, label, unit, better_direction, chart_type, category,
            benchmark_key, action_type, is_kpi_card, sort_order, is_active
       FROM ${S}.segment_metric_catalog
      WHERE segment_id = $1::uuid AND is_active = true
      ORDER BY sort_order ASC, label ASC`,
    [segmentId],
  );
  return rows.map((r) => ({
    metricKey: r.metric_key,
    metaField: r.meta_field,
    label: r.label,
    unit: r.unit,
    betterDirection: r.better_direction,
    chartType: r.chart_type,
    category: r.category,
    benchmarkKey: r.benchmark_key,
    actionType: r.action_type,
    isKpiCard: r.is_kpi_card,
    sortOrder: r.sort_order,
    isActive: r.is_active,
  }));
}

/**
 * Replace-all transacional — mesmo padrão de saveSegmentAngles/saveSegmentInterests: apaga
 * tudo do segmento e reinsere exatamente o que foi enviado (a UI sempre manda a lista completa).
 */
export async function saveSegmentMetrics(
  segmentId: string,
  metrics: Partial<SegmentMetric>[],
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM ${S}.segment_metric_catalog WHERE segment_id = $1::uuid`,
      [segmentId],
    );

    let inserted = 0;
    let order = 0;
    for (const m of metrics) {
      const metaField = (m.metaField || '').trim();
      const label = (m.label || '').trim();
      if (!metaField || !label) continue;
      const metricKey = slugifyKey(m.metricKey || label);
      if (!metricKey) continue;

      await client.query(
        `INSERT INTO ${S}.segment_metric_catalog
           (segment_id, metric_key, meta_field, label, unit, better_direction, chart_type,
            category, benchmark_key, action_type, is_kpi_card, sort_order, is_active)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
         ON CONFLICT (segment_id, metric_key) DO UPDATE SET
           meta_field = EXCLUDED.meta_field, label = EXCLUDED.label, unit = EXCLUDED.unit,
           better_direction = EXCLUDED.better_direction, chart_type = EXCLUDED.chart_type,
           category = EXCLUDED.category, benchmark_key = EXCLUDED.benchmark_key,
           action_type = EXCLUDED.action_type,
           is_kpi_card = EXCLUDED.is_kpi_card, sort_order = EXCLUDED.sort_order,
           is_active = true, updated_at = now()`,
        [
          segmentId, metricKey, metaField, label,
          m.unit || 'count', m.betterDirection || 'higher_is_better', m.chartType || 'line',
          m.category || 'desempenho', m.benchmarkKey || null, m.actionType || null,
          !!m.isKpiCard, order,
        ],
      );
      inserted++;
      order++;
    }

    await client.query('COMMIT');
    return inserted;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Campos da Meta Insights API que são ARRAYS genéricos de {action_type, value} — exigem
 * `action_type` pra resolver uma métrica específica, diferente de campo simples/plano. */
const ARRAY_META_FIELDS = new Set(['actions', 'action_values', 'cost_per_action_type']);

/** Campos de vídeo da Meta também voltam como array de {action_type, value}, mas sempre com
 * 1 elemento só — mesma convenção já usada no adapter hoje (pickVideoAction): pega o valor do
 * índice 0, sem precisar de action_type explícito. */
function isVideoWatchedActionsField(metaField: string): boolean {
  return metaField.endsWith('_watched_actions');
}

/** Nomes de meta_field distintos que já são pedidos fixo hoje em fetchInsights (ver
 * metaAdsAdapter.ts) — não precisam entrar na lista de "fields extras" do Fase 2. */
export const ALREADY_FETCHED_META_FIELDS = new Set([
  'impressions', 'reach', 'clicks', 'spend', 'cpc', 'cpm', 'ctr', 'actions', 'frequency',
  'action_values', 'cost_per_action_type', 'quality_ranking', 'engagement_rate_ranking',
  'conversion_rate_ranking', 'link_clicks', 'landing_page_views',
  'video_3_sec_watched_actions', 'video_15_sec_watched_actions', 'video_p25_watched_actions',
  'video_p50_watched_actions', 'video_p75_watched_actions', 'video_p100_watched_actions',
  'video_thruplay_watched_actions',
]);

/**
 * Resolve o valor real de UMA métrica configurada a partir da linha crua que a Meta Insights
 * API devolve. `row` é o objeto bruto (antes de qualquer mapeamento do adapter) — campo simples
 * vira Number direto; campo-array (actions/action_values/cost_per_action_type) filtra por
 * `action_type`. `null` = não achou dado pra essa métrica nessa linha (nunca inventa 0).
 */
export function resolveCustomMetricValue(metric: SegmentMetric, row: Record<string, any>): number | null {
  if (isVideoWatchedActionsField(metric.metaField)) {
    const arr: any[] = row[metric.metaField] || [];
    const v = arr?.[0]?.value;
    if (v === undefined || v === null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (ARRAY_META_FIELDS.has(metric.metaField)) {
    if (!metric.actionType) return null;
    const arr: any[] = row[metric.metaField] || [];
    const found = arr.find((a) => a?.action_type === metric.actionType);
    if (!found || found.value === undefined || found.value === null) return null;
    const n = Number(found.value);
    return Number.isFinite(n) ? n : null;
  }
  const raw = row[metric.metaField];
  if (raw === undefined || raw === null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** Monta o bag {metricKey: valor} pra TODAS as métricas configuradas de um segmento, a partir
 * de uma única linha crua da Meta. Usado pela Fase 2 (adapter) pra popular Insight.custom_metrics. */
export function buildCustomMetrics(metrics: SegmentMetric[], row: Record<string, any>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const m of metrics) {
    const v = resolveCustomMetricValue(m, row);
    if (v !== null) out[m.metricKey] = v;
  }
  return out;
}

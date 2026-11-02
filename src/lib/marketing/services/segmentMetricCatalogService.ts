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
            benchmark_key, is_kpi_card, sort_order, is_active
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
            category, benchmark_key, is_kpi_card, sort_order, is_active)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
         ON CONFLICT (segment_id, metric_key) DO UPDATE SET
           meta_field = EXCLUDED.meta_field, label = EXCLUDED.label, unit = EXCLUDED.unit,
           better_direction = EXCLUDED.better_direction, chart_type = EXCLUDED.chart_type,
           category = EXCLUDED.category, benchmark_key = EXCLUDED.benchmark_key,
           is_kpi_card = EXCLUDED.is_kpi_card, sort_order = EXCLUDED.sort_order,
           is_active = true, updated_at = now()`,
        [
          segmentId, metricKey, metaField, label,
          m.unit || 'count', m.betterDirection || 'higher_is_better', m.chartType || 'line',
          m.category || 'desempenho', m.benchmarkKey || null, !!m.isKpiCard, order,
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

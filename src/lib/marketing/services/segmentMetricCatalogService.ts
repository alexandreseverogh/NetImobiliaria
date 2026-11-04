/**
 * Catálogo de Métricas Dinâmico — Fase 1 (ver docs/CHECKPOINT.md "Tarefa em andamento",
 * 2026-11-02). Metadado de métrica por segmento, curado pelo Master, substituindo aos poucos
 * o conjunto fixo de colunas em campanhasmarketingdigital."Insight".
 */

import pool from '@/lib/database/connection';
import { resolveSegment } from '@/lib/intelligence/segmentResolver';

const S = 'campanhasmarketingdigital';

export type MetricUnit = 'currency' | 'percent' | 'count' | 'ratio' | 'score';
export type MetricDirection = 'higher_is_better' | 'lower_is_better' | 'neutral';
export type MetricChartType = 'area' | 'line' | 'bar';
/** Taxonomia real da Meta (Gerenciador de Anúncios → "Personalizar colunas"), levantada ao vivo
 * em 2026-11-03 — não mais inventada. 'video' mescla "Reconhecimento > Mídia" com "Rastreamento >
 * Mídia" (a Meta separa os dois só por abas de UI, mesmo assunto); 'mensagens' mescla
 * "Engajamento > Mensagens/Ligações" com "Rastreamento > Mensagens e ligações > Bloqueios". A 3ª
 * aba real da Meta ("Configurações de anúncios") não entra aqui — é atributo/config
 * (nome/orçamento/segmentação), não métrica numérica graficável. */
export type MetricCategory =
  | 'gasto' | 'distribuicao' | 'video' | 'cliques' | 'trafego'
  | 'engajamento' | 'mensagens' | 'diagnostico' | 'conversoes';

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
         ON CONFLICT (segment_id, metric_key) WHERE segment_id IS NOT NULL DO UPDATE SET
           meta_field = EXCLUDED.meta_field, label = EXCLUDED.label, unit = EXCLUDED.unit,
           better_direction = EXCLUDED.better_direction, chart_type = EXCLUDED.chart_type,
           category = EXCLUDED.category, benchmark_key = EXCLUDED.benchmark_key,
           action_type = EXCLUDED.action_type,
           is_kpi_card = EXCLUDED.is_kpi_card, sort_order = EXCLUDED.sort_order,
           is_active = true, updated_at = now()`,
        [
          segmentId, metricKey, metaField, label,
          m.unit || 'count', m.betterDirection || 'higher_is_better', m.chartType || 'line',
          m.category || 'gasto', m.benchmarkKey || null, m.actionType || null,
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

// ─── Cascata Segmento → Tenant → Cliente (ver docs/CHECKPOINT.md, plano "typed-percolating-
// riddle") ─────────────────────────────────────────────────────────────────────────────────
// getSegmentMetrics/saveSegmentMetrics acima ficam intocadas de propósito — já filtram por
// segment_id, que nas linhas novas abaixo é sempre NULL, então nunca leem/escrevem por engano
// uma linha de tenant/cliente. As funções a seguir são autocontidas, cópias adaptadas (não um
// genérico compartilhado) — mesmo padrão já aceito no código-base pra LLM (SegmentLlmDefaultModal
// vs LlmCascadeSection são 2 implementações separadas, não uma só).

export type MetricScopeLevel = 'client' | 'client_segment' | 'tenant' | 'segment';

/** Override do PRÓPRIO tenant (tenant_id preenchido, client_id NULL). */
export async function getTenantMetrics(tenantId: string): Promise<SegmentMetric[]> {
  const { rows } = await pool.query(
    `SELECT metric_key, meta_field, label, unit, better_direction, chart_type, category,
            benchmark_key, action_type, is_kpi_card, sort_order, is_active
       FROM ${S}.segment_metric_catalog
      WHERE tenant_id = $1::uuid AND client_id IS NULL AND is_active = true
      ORDER BY sort_order ASC, label ASC`,
    [tenantId],
  );
  return rows.map(mapMetricRow);
}

/** Override de 1 cliente específico (tenant_id + client_id preenchidos). */
export async function getClientMetrics(tenantId: string, clientId: string): Promise<SegmentMetric[]> {
  const { rows } = await pool.query(
    `SELECT metric_key, meta_field, label, unit, better_direction, chart_type, category,
            benchmark_key, action_type, is_kpi_card, sort_order, is_active
       FROM ${S}.segment_metric_catalog
      WHERE tenant_id = $1::uuid AND client_id = $2::uuid AND is_active = true
      ORDER BY sort_order ASC, label ASC`,
    [tenantId, clientId],
  );
  return rows.map(mapMetricRow);
}

function mapMetricRow(r: any): SegmentMetric {
  return {
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
  };
}

/** Replace-all transacional pro override do TENANT — mesma mecânica de saveSegmentMetrics,
 * escrevendo segment_id=NULL + tenant_id preenchido, client_id NULL. */
export async function saveTenantMetrics(
  tenantId: string,
  metrics: Partial<SegmentMetric>[],
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM ${S}.segment_metric_catalog WHERE tenant_id = $1::uuid AND client_id IS NULL`,
      [tenantId],
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
           (tenant_id, client_id, metric_key, meta_field, label, unit, better_direction,
            chart_type, category, benchmark_key, action_type, is_kpi_card, sort_order, is_active)
         VALUES ($1::uuid, NULL, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true)
         ON CONFLICT (tenant_id, metric_key) WHERE tenant_id IS NOT NULL AND client_id IS NULL DO UPDATE SET
           meta_field = EXCLUDED.meta_field, label = EXCLUDED.label, unit = EXCLUDED.unit,
           better_direction = EXCLUDED.better_direction, chart_type = EXCLUDED.chart_type,
           category = EXCLUDED.category, benchmark_key = EXCLUDED.benchmark_key,
           action_type = EXCLUDED.action_type,
           is_kpi_card = EXCLUDED.is_kpi_card, sort_order = EXCLUDED.sort_order,
           is_active = true, updated_at = now()`,
        [
          tenantId, metricKey, metaField, label,
          m.unit || 'count', m.betterDirection || 'higher_is_better', m.chartType || 'line',
          m.category || 'gasto', m.benchmarkKey || null, m.actionType || null,
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

/** Replace-all transacional pro override de 1 CLIENTE específico. */
export async function saveClientMetrics(
  tenantId: string,
  clientId: string,
  metrics: Partial<SegmentMetric>[],
): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM ${S}.segment_metric_catalog WHERE tenant_id = $1::uuid AND client_id = $2::uuid`,
      [tenantId, clientId],
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
           (tenant_id, client_id, metric_key, meta_field, label, unit, better_direction,
            chart_type, category, benchmark_key, action_type, is_kpi_card, sort_order, is_active)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
         ON CONFLICT (tenant_id, client_id, metric_key) WHERE client_id IS NOT NULL DO UPDATE SET
           meta_field = EXCLUDED.meta_field, label = EXCLUDED.label, unit = EXCLUDED.unit,
           better_direction = EXCLUDED.better_direction, chart_type = EXCLUDED.chart_type,
           category = EXCLUDED.category, benchmark_key = EXCLUDED.benchmark_key,
           action_type = EXCLUDED.action_type,
           is_kpi_card = EXCLUDED.is_kpi_card, sort_order = EXCLUDED.sort_order,
           is_active = true, updated_at = now()`,
        [
          tenantId, clientId, metricKey, metaField, label,
          m.unit || 'count', m.betterDirection || 'higher_is_better', m.chartType || 'line',
          m.category || 'gasto', m.benchmarkKey || null, m.actionType || null,
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

/** Restaura herança — remove a linha de verdade, nunca "salva vazio" (lição já aprendida na
 * cascata de LLM: upsert com COALESCE preservaria o valor antigo em vez de limpar). */
export async function deleteTenantMetrics(tenantId: string): Promise<void> {
  await pool.query(
    `DELETE FROM ${S}.segment_metric_catalog WHERE tenant_id = $1::uuid AND client_id IS NULL`,
    [tenantId],
  );
}

export async function deleteClientMetrics(tenantId: string, clientId: string): Promise<void> {
  await pool.query(
    `DELETE FROM ${S}.segment_metric_catalog WHERE tenant_id = $1::uuid AND client_id = $2::uuid`,
    [tenantId, clientId],
  );
}

/** Decide se uma métrica curada deve ser agregada por MÉDIA (taxa/score/custo) ou SOMA
 * (contagem/valor) no período — mesma regra usada no Explorador (Fase 3) e no Briefing
 * Estratégico (Fase 4), extraída aqui como fonte única pra nunca divergir entre os dois. */
export function isAverageMetric(metric: SegmentMetric): boolean {
  return metric.unit === 'percent' || metric.unit === 'ratio' || metric.unit === 'score'
    || metric.metaField.startsWith('cost_per_');
}

/**
 * Resolve o catálogo EFETIVO pra um tenant/cliente — cascata completa, 4 resultados possíveis
 * de `resolvedLevel`, nesta ordem de prioridade:
 *
 *   1. Override do PRÓPRIO cliente — sempre vence, decisão pontual e deliberada.
 *   2. Cliente de segmento DISTINTO do tenant pula o override genérico do tenant — o default
 *      vertical-específico do PRÓPRIO segmento do cliente é mais relevante pra calibração do
 *      que um override pensado com o negócio do TENANT em mente (ex.: tenant "Marketing
 *      Digital" tem clientes reais em "Venda de Carros"/"Saúde Digital" — um override genérico
 *      de agência não tem por que valer pra esses verticais).
 *   3. Override de tenant — só chega aqui sem (1) nem (2) acima.
 *   4. Default do segmento do PRÓPRIO tenant.
 *
 * Sem `clientId` (escopo "Minha Empresa"): o passo 2 nunca dispara, cascata vira simplesmente
 * Tenant → Segmento do tenant — igual LLM/Prompt hoje. Autocontida: resolve segmento
 * internamente, callers não precisam chamar resolveSegment à parte só pra isso.
 */
export async function getEffectiveMetrics(
  tenantId: string,
  clientId: string | null,
): Promise<{ metrics: SegmentMetric[]; resolvedLevel: MetricScopeLevel }> {
  if (clientId) {
    const rows = await getClientMetrics(tenantId, clientId);
    if (rows.length > 0) return { metrics: rows, resolvedLevel: 'client' };
  }

  const tenantSegment = await resolveSegment(tenantId, null);
  let clientOwnSegmentId: string | null = null;
  if (clientId) {
    const { rows } = await pool.query<{ segment_id: string | null }>(
      `SELECT segment_id FROM public.clientes WHERE uuid = $1::uuid LIMIT 1`,
      [clientId],
    );
    clientOwnSegmentId = rows[0]?.segment_id ?? null;
  }
  if (clientOwnSegmentId && clientOwnSegmentId !== tenantSegment?.id) {
    const segMetrics = await getSegmentMetrics(clientOwnSegmentId);
    return { metrics: segMetrics, resolvedLevel: 'client_segment' };
  }

  const tenantRows = await getTenantMetrics(tenantId);
  if (tenantRows.length > 0) return { metrics: tenantRows, resolvedLevel: 'tenant' };

  const segMetrics = tenantSegment?.id ? await getSegmentMetrics(tenantSegment.id) : [];
  return { metrics: segMetrics, resolvedLevel: 'segment' };
}

/**
 * Variante de `getEffectiveMetrics` pra quando o caller JÁ SABE qual segmento está narrando
 * (Briefing Estratégico multi-segmento, FASE 18.2/Fase 4 — cada chamada de
 * `generateStrategicBriefing` recebe o segmento explícito via `getActiveSegmentsForScope`).
 * Nunca re-deriva o segmento internamente via `resolveSegment` — isso erraria o segmento da
 * iteração quando o escopo é agregado (`clientId` ausente, "Todos os Clientes") e o loop está
 * narrando o segmento de um CLIENTE, não o do tenant. Mesma cascata Cliente > Tenant > Segmento,
 * com o mesmo cuidado de nunca vazar o override do tenant pra um vertical que não é o dele.
 */
export async function getEffectiveMetricsForSegment(
  tenantId: string,
  clientId: string | null,
  segmentId: string,
): Promise<{ metrics: SegmentMetric[]; resolvedLevel: MetricScopeLevel }> {
  if (clientId) {
    const rows = await getClientMetrics(tenantId, clientId);
    if (rows.length > 0) return { metrics: rows, resolvedLevel: 'client' };
  }

  // Override de tenant só vale quando o segmento sendo narrado é o PRÓPRIO segmento do tenant —
  // mesmo critério já usado em getEffectiveMetrics pro branch client_segment.
  const tenantSegment = await resolveSegment(tenantId, null);
  if (tenantSegment?.id === segmentId) {
    const tenantRows = await getTenantMetrics(tenantId);
    if (tenantRows.length > 0) return { metrics: tenantRows, resolvedLevel: 'tenant' };
  }

  const segMetrics = await getSegmentMetrics(segmentId);
  return { metrics: segMetrics, resolvedLevel: 'segment' };
}

/** Campos da Meta Insights API que são ARRAYS genéricos de {action_type, value} — exigem
 * `action_type` pra resolver uma métrica específica, diferente de campo simples/plano. */
const ARRAY_META_FIELDS = new Set(['actions', 'action_values', 'cost_per_action_type']);

/** Campos reais da Meta Insights API (`lista<AdsActionStats>`, confirmados na referência oficial
 * auto-gerada em 2026-11-03) que sempre voltam com 1 elemento só no array, mesma convenção já
 * usada no adapter hoje pra vídeo (pickVideoAction): pega o valor do índice 0, sem precisar de
 * action_type explícito — diferente de `actions`/`action_values`/`cost_per_action_type`, que
 * têm múltiplos action_type reais na mesma resposta e exigem filtro. Nunca chutado — cada campo
 * aqui foi confirmado como `lista<AdsActionStats>` na doc oficial antes de entrar nesta lista. */
const SINGLE_VALUE_ACTION_ARRAY_FIELDS = new Set([
  'video_3_sec_watched_actions', 'video_15_sec_watched_actions',
  'video_p25_watched_actions', 'video_p50_watched_actions', 'video_p75_watched_actions',
  'video_p95_watched_actions', 'video_p100_watched_actions', 'video_thruplay_watched_actions',
  'video_avg_time_watched_actions', 'video_play_actions', 'video_continuous_2_sec_watched_actions',
  'cost_per_thruplay', 'cost_per_2_sec_continuous_video_view',
  'website_ctr', 'website_purchase_roas', 'mobile_app_purchase_roas', 'purchase_roas',
  'outbound_clicks', 'outbound_clicks_ctr', 'cost_per_outbound_click',
  'cost_per_unique_outbound_click', 'unique_outbound_clicks',
]);

function isSingleValueActionArrayField(metaField: string): boolean {
  return SINGLE_VALUE_ACTION_ARRAY_FIELDS.has(metaField) || metaField.endsWith('_watched_actions');
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
  if (isSingleValueActionArrayField(metric.metaField)) {
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

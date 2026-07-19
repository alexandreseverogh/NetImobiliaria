import { Pool } from 'pg';

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });
  return _pool;
}

/**
 * Valores iniciais usados APENAS para semear system_benchmarks ao criar um novo segmento.
 * NÃO são usados em runtime — cada segmento deve ter seus próprios valores no banco.
 * Exportado para uso em /api/admin/master/segments (POST).
 */
export const SEGMENT_SEED_DEFAULTS: Record<string, { value: number; label: string; unit: string; description: string }> = {
  // Detecção
  cpl_ideal:          { value: 30,   label: 'CPL Ideal (R$)',             unit: 'BRL', description: 'CPL considerado bom — base para sugerir escala' },
  cpl_critical:       { value: 80,   label: 'CPL Crítico (R$)',           unit: 'BRL', description: 'CPL acima disto → pausa ou redução de budget' },
  ctr_min:            { value: 1.0,  label: 'CTR Mínimo (%)',             unit: 'PCT', description: 'CTR abaixo disto indica criativo fraco' },
  ctr_scale:          { value: 2.0,  label: 'CTR p/ Escalar (%)',         unit: 'PCT', description: 'CTR excelente → agente sugere SCALE' },
  frequency_max:      { value: 3.0,  label: 'Frequência Máxima',          unit: 'NUM', description: 'Acima disto a audiência está saturada' },
  spend_no_lead:      { value: 50,   label: 'Gasto sem Lead (R$)',        unit: 'BRL', description: 'Gasto máximo sem nenhum lead antes de pausar' },
  min_leads_scale:    { value: 5,    label: 'Leads Mín. p/ Escalar',      unit: 'NUM', description: 'Mínimo de leads no período para recomendar escala' },
  min_days_running:   { value: 3,    label: 'Dias Mín. Rodando',          unit: 'NUM', description: 'Dias mínimos de campanha antes de qualquer avaliação' },
  hook_rate_critical: { value: 8,    label: 'Hook Rate Crítico (%)',      unit: 'PCT', description: 'Hook rate abaixo disto → criativo de vídeo ruim' },
  hook_rate_min:      { value: 12,   label: 'Hook Rate Mínimo (%)',       unit: 'PCT', description: 'Hook rate mínimo aceitável para vídeos' },
  hook_rate_good:     { value: 22,   label: 'Hook Rate Bom (%)',          unit: 'PCT', description: 'A partir daqui o vídeo tem boa retenção' },
  // Execução
  scale_budget_base_pct: { value: 10, label: 'Escala Base (%)',            unit: 'PCT', description: '% mínimo ao escalar — campanha acabou de passar no threshold' },
  scale_budget_max_pct:  { value: 25, label: 'Escala Máxima (%)',          unit: 'PCT', description: 'Teto de % ao escalar — manter ≤25% para não resetar aprendizado' },
  scale_ratio_cap:       { value: 3.0, label: 'CTR Cap (×threshold)',      unit: 'NUM', description: 'Multiplicador de CTR que atinge a escala máxima' },
  scale_budget_pct:     { value: 30, label: 'Escala de Budget (%)',       unit: 'PCT', description: '% de aumento do budget ao escalar (após aprovação)' },
  downscale_budget_pct: { value: 30, label: 'Redução de Budget (%)',      unit: 'PCT', description: '% de redução do budget ao downscalar (defensivo)' },
  scale_budget_max:     { value: 0,  label: 'Teto de Budget (R$)',        unit: 'BRL', description: 'Teto diário por adset ao escalar (0 = sem teto)' },
  // Sinais & Aprendizado (signal engine)
  cpm_delta_max:         { value: 0.20, label: 'CPM Delta Máx (%)',         unit: 'PCT', description: 'Variação % de CPM acima disto dispara alerta de custo' },
  fir_floor:             { value: 0.20, label: 'First Impression Ratio Mín', unit: 'NUM', description: 'FIR mínimo saudável (impressões únicas / total)' },
  learning_conv_target:  { value: 50,   label: 'Conversões p/ Sair do Learning', unit: 'NUM', description: 'Conversões que o Meta exige para sair da fase de aprendizado' },
  pressure_w_engagement: { value: 0.40, label: 'Peso Engagement (Pressão)', unit: 'NUM', description: 'Peso do engagement_rate_ranking no índice de pressão' },
  pressure_w_conversion: { value: 0.35, label: 'Peso Conversão (Pressão)',  unit: 'NUM', description: 'Peso do conversion_rate_ranking no índice de pressão' },
  pressure_w_quality:    { value: 0.25, label: 'Peso Qualidade (Pressão)',  unit: 'NUM', description: 'Peso do quality_ranking no índice de pressão' },
  // FASE 1 (Google Ads) — regra IMPRESSION_SHARE_OPPORTUNITY
  is_lost_budget_scale_min: { value: 20, label: 'IS Lost Budget p/ Escalar (%)', unit: 'PCT', description: 'IS perdido por orçamento acima disso + CPL bom → oportunidade real de aumentar verba' },
};

/**
 * Resolves a single benchmark metric following 4-layer precedence:
 *   1. client_benchmark_overrides  (most specific)
 *   2. tenant_benchmark_overrides
 *   3. system_benchmarks for the resolved segment
 *   4. ERROR — segmento não configurado (nunca deveria chegar aqui em produção)
 */
export async function resolveBenchmark(
  metricKey: string,
  tenantId: string,
  segmentId: string | null,
  clientId?: string | null,
): Promise<number> {
  const pool = getPool();

  // Layer 1 — client override
  if (clientId && clientId !== 'own') {
    const res = await pool.query(
      `SELECT value FROM public.client_benchmark_overrides
       WHERE client_id = $1::uuid AND metric_key = $2 LIMIT 1`,
      [clientId, metricKey],
    );
    if (res.rows[0]) return parseFloat(res.rows[0].value);
  }

  // Layer 2 — tenant override
  const tenantRes = await pool.query(
    `SELECT value FROM public.tenant_benchmark_overrides
     WHERE tenant_id = $1::uuid AND metric_key = $2 LIMIT 1`,
    [tenantId, metricKey],
  );
  if (tenantRes.rows[0]) return parseFloat(tenantRes.rows[0].value);

  // Layer 3 — segment benchmark (source of truth por segmento de negócio)
  if (segmentId) {
    const segRes = await pool.query(
      `SELECT value FROM public.system_benchmarks
       WHERE segment_id = $1::uuid AND metric_key = $2 LIMIT 1`,
      [segmentId, metricKey],
    );
    if (segRes.rows[0]) return parseFloat(segRes.rows[0].value);
  }

  // Layer 4 — chave ausente no banco: segmento não está totalmente configurado.
  // Isso NÃO deveria acontecer em produção — configure via /admin/master/segments → Parâmetros.
  console.error(
    `[benchmarkResolver] BENCHMARK NÃO CONFIGURADO: "${metricKey}" | segment=${segmentId ?? 'null'} | tenant=${tenantId}. ` +
    `Acesse /admin/master/segments e clique em "Parâmetros" para configurar este segmento.`,
  );
  // Usa o seed default como emergência para não crashar, mas o erro acima é visível nos logs.
  return SEGMENT_SEED_DEFAULTS[metricKey]?.value ?? 0;
}

/** Resolves multiple benchmark metrics in a single call (runs in parallel). */
export async function resolveBenchmarks(
  keys: string[],
  tenantId: string,
  segmentId: string | null,
  clientId?: string | null,
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    keys.map(async (key) => [key, await resolveBenchmark(key, tenantId, segmentId, clientId)] as const),
  );
  return Object.fromEntries(entries);
}

export type BenchmarkMap = Record<string, number>;

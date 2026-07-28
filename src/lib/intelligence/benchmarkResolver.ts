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
  // docs/PLANO_TIKTOK.md §8.5 — motor de realocação cross-rede (T4)
  realloc_min_cpl_gap_pct:      { value: 30, label: 'Vantagem Mín. p/ Realocar (%)',    unit: 'PCT', description: 'Diferença de CPL entre origem e destino, mínima pra propor realocação' },
  realloc_max_pct_of_source:    { value: 30, label: 'Teto de Retirada da Origem (%)',   unit: 'PCT', description: 'Máximo do budget da origem que pode ser realocado numa proposta' },
  realloc_marginal_haircut_pct: { value: 25, label: 'Desconto Marginal (%)',            unit: 'PCT', description: 'Degradação esperada do CPL do destino ao receber verba extra — protege contra superestimar o ganho' },
  realloc_max_abs_cents:        { value: 5000, label: 'Teto Absoluto por Proposta (R$)', unit: 'BRL', description: 'Valor máximo diário realocável numa única proposta' },
  realloc_cooldown_days:        { value: 14, label: 'Cooldown entre Propostas (dias)',  unit: 'NUM', description: 'Dias sem repetir proposta pro mesmo par origem→destino' },
};

/**
 * Resolves a single benchmark metric following precedence (5 layers quando networkCode é
 * informado, 4 quando não é — retrocompatível por construção):
 *   1. client_benchmark_overrides  (most specific — sem dimensão de rede, ver nota abaixo)
 *   2. tenant_benchmark_overrides  (idem)
 *   3. system_benchmarks para o segmento resolvido, NA REDE informada (docs/PLANO_TIKTOK.md §5.1)
 *   4. system_benchmarks para o segmento resolvido, sem rede (comportamento histórico)
 *   5. ERROR — segmento não configurado (nunca deveria chegar aqui em produção)
 *
 * Nota de escopo (T0, 2026-07-27): client_benchmark_overrides/tenant_benchmark_overrides
 * deliberadamente NÃO ganharam dimensão de rede nesta rodada — são customizações raras e
 * opt-in (já têm UI/API própria); o achado bloqueante (cpl_ideal do Meta aplicado ao TikTok)
 * vive na camada 3/4 (o default do segmento, que toda campanha nova usa antes de qualquer
 * override manual existir). Camada de rede em overrides fica como extensão natural futura,
 * se um tenant precisar customizar benchmark por rede além do default do segmento.
 */
export async function resolveBenchmark(
  metricKey: string,
  tenantId: string,
  segmentId: string | null,
  clientId?: string | null,
  networkCode?: string | null,
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

  if (segmentId) {
    // Layer 3 — benchmark do segmento NA REDE informada (docs/PLANO_TIKTOK.md §5.1). Subquery
    // com código de rede inválido/ausente resolve NULL, e "network_id = NULL" nunca casa em
    // SQL — cai graciosamente pra camada 4, nunca lança erro.
    if (networkCode) {
      const segNetRes = await pool.query(
        `SELECT value FROM public.system_benchmarks
         WHERE segment_id = $1::uuid AND metric_key = $2
           AND network_id = (SELECT id FROM public.ad_networks WHERE code = $3)
         LIMIT 1`,
        [segmentId, metricKey, networkCode],
      );
      if (segNetRes.rows[0]) return parseFloat(segNetRes.rows[0].value);
    }

    // Layer 4 — benchmark do segmento sem rede (comportamento histórico, 100% preservado —
    // toda linha existente antes desta migração tem network_id IS NULL).
    const segRes = await pool.query(
      `SELECT value FROM public.system_benchmarks
       WHERE segment_id = $1::uuid AND metric_key = $2 AND network_id IS NULL LIMIT 1`,
      [segmentId, metricKey],
    );
    if (segRes.rows[0]) return parseFloat(segRes.rows[0].value);
  }

  // Layer 5 — chave ausente no banco: segmento não está totalmente configurado.
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
  networkCode?: string | null,
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    keys.map(async (key) => [key, await resolveBenchmark(key, tenantId, segmentId, clientId, networkCode)] as const),
  );
  return Object.fromEntries(entries);
}

export type BenchmarkMap = Record<string, number>;

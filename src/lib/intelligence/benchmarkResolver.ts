import { Pool } from 'pg';

let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) _pool = new Pool({ connectionString: process.env.MARKETING_DATABASE_URL });
  return _pool;
}

/**
 * Hard-coded last-resort fallbacks. Used only when no DB row exists for any layer.
 * These should match the 'geral' segment seeds in the migration.
 */
const GLOBAL_FALLBACKS: Record<string, number> = {
  cpl_ideal: 30,
  cpl_critical: 80,
  ctr_min: 1.0,
  ctr_scale: 2.0,
  frequency_max: 3.0,
  spend_no_lead: 50,
  min_leads_scale: 5,
  min_days_running: 3,
  // FASE 5 — Hook Rate (% de impressões que assistem 3s)
  hook_rate_critical: 8,
  hook_rate_min: 12,
  hook_rate_good: 22,
};

/**
 * Resolves a single benchmark metric following 4-layer precedence:
 *   1. client_benchmark_overrides  (most specific)
 *   2. tenant_benchmark_overrides
 *   3. system_benchmarks for the resolved segment
 *   4. GLOBAL_FALLBACKS constant   (last resort)
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

  // Layer 3 — segment default
  if (segmentId) {
    const segRes = await pool.query(
      `SELECT value FROM public.system_benchmarks
       WHERE segment_id = $1::uuid AND metric_key = $2 LIMIT 1`,
      [segmentId, metricKey],
    );
    if (segRes.rows[0]) return parseFloat(segRes.rows[0].value);
  }

  // Layer 4 — global fallback constant
  return GLOBAL_FALLBACKS[metricKey] ?? 0;
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

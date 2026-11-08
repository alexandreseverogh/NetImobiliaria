import { resolveBenchmark } from '@/lib/intelligence/benchmarkResolver'

/**
 * Escala visual da barra de eficiência (benchmark efficiency_bar_max) para um escopo.
 * Mesma regra usada pelo cross-insights, para que a calibração compare iguais.
 */
export function resolveEfficiencyBarMax(
  tenantId: string,
  segmentId: string | null,
  clientId?: string | null,
): Promise<number> {
  return resolveBenchmark('efficiency_bar_max', tenantId, segmentId, clientId ?? null)
}

import { resolveBenchmark } from '@/lib/intelligence/benchmarkResolver'

/**
 * Fator de alerta de CPL (benchmark warn_cpl_factor) para um escopo.
 * Cascata e erro explícito vêm do benchmarkResolver; o classificador valida o valor.
 */
export function resolveWarnCplFactor(
  tenantId: string,
  segmentId: string | null,
  clientId?: string | null,
): Promise<number> {
  return resolveBenchmark('warn_cpl_factor', tenantId, segmentId, clientId ?? null)
}

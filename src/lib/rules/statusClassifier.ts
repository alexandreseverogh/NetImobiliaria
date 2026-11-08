/**
 * Classificação única de status por CPL vs benchmark (plano REGRAS_CONFIGURAVEIS §4.1).
 *
 * Regra:
 *   nodata   — sem valor de CPL (ou sem gasto)
 *   critical — CPL >= cplCritical (operador confirmado no plano: >=)
 *   warn     — CPL > cplIdeal × warnFactor
 *   ok       — caso contrário
 *
 * warnFactor é obrigatório: o valor de referência ainda está em decisão (1.0 hoje no portfólio,
 * 1.15 previsto no plano). Não há default escondido.
 */

export type CplStatus = 'ok' | 'warn' | 'critical' | 'nodata'

export interface CplBenchmark {
  cplIdeal: number | null
  cplCritical: number | null
}

export function classifyCpl(
  cpl: number | null,
  benchmark: CplBenchmark,
  warnFactor: number | null,
  spend?: number,
): CplStatus {
  if (benchmark.cplIdeal !== null && (warnFactor === null || !Number.isFinite(warnFactor) || warnFactor < 1)) {
    throw new Error(`warnFactor inválido (${warnFactor}): deve ser número >= 1 vindo do benchmark warn_cpl_factor`)
  }
  if (spend !== undefined && spend === 0) return 'nodata'
  if (cpl === null || !Number.isFinite(cpl)) return 'nodata'
  if (benchmark.cplCritical !== null && cpl >= benchmark.cplCritical) return 'critical'
  if (benchmark.cplIdeal !== null && cpl > benchmark.cplIdeal * (warnFactor as number)) return 'warn'
  return 'ok'
}

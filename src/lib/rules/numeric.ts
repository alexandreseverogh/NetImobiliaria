/**
 * Leitura de parâmetros numéricos de configuração.
 *
 * Regra: ZERO é valor válido. Nunca usar `x || default` para parâmetro numérico, porque
 * `0 || default` troca um valor real por um padrão silenciosamente (ver
 * docs/PLANO_REGRAS_CONFIGURAVEIS.md, §1.3).
 *
 * Ausência (null/undefined/'') devolve o `fallback` informado. Valor presente mas inválido
 * lança erro, em vez de virar padrão.
 */
export function readNumericParam(value: unknown, fallback: number): number {
  if (value === null || value === undefined || value === '') return fallback
  const n = typeof value === 'number' ? value : Number(String(value).trim())
  if (!Number.isFinite(n)) {
    throw new Error(`Parâmetro numérico inválido: ${JSON.stringify(value)}`)
  }
  return n
}

import { timingSafeEqual } from 'crypto'

/**
 * Verificação única do segredo de cron (header x-cron-secret).
 * Falha fechado: sem CRON_SECRET configurado, NENHUMA requisição passa.
 * Nunca existe valor de fallback no código (ver docs/PLANO_REGRAS_CONFIGURAVEIS.md, §4.6).
 */
export function verifyCronSecret(
  provided: string | null | undefined,
  expected: string | undefined = process.env.CRON_SECRET,
): boolean {
  if (!expected || expected.length === 0) return false
  if (!provided) return false
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

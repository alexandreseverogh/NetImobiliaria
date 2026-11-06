import { randomInt, timingSafeEqual } from 'crypto'

/**
 * Único ponto de geração e validação de PIN de aprovação do sistema.
 * Substitui os geradores com Math.random() em agentDecisor, reallocationEngine e crm/agents/runner.
 * Ver docs/PLANO_REGRAS_CONFIGURAVEIS.md §4.5.
 */

/** Validade do PIN. Fixa em código por segurança (não configurável pelo tenant). */
export const PIN_TTL_MINUTES = 24 * 60

export function issuePin(now: Date = new Date()): { pin: string; expiresAt: Date } {
  // randomInt(min, max) — max exclusivo. Faixa 100000..999999 = sempre 6 dígitos.
  const pin = String(randomInt(100000, 1000000))
  const expiresAt = new Date(now.getTime() + PIN_TTL_MINUTES * 60_000)
  return { pin, expiresAt }
}

export type PinCheck =
  | { ok: true }
  | { ok: false; reason: 'missing' | 'expired' | 'incorrect' }

/** Comparação em tempo constante. Entradas de tamanhos diferentes são rejeitadas sem exceção. */
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

export function verifyPin(params: {
  provided: string
  expected: string | null
  expiresAt: Date | null
  now?: Date
}): PinCheck {
  const { provided, expected, expiresAt, now = new Date() } = params
  if (!expected || !expiresAt) return { ok: false, reason: 'missing' }
  if (now.getTime() > expiresAt.getTime()) return { ok: false, reason: 'expired' }
  if (!safeEqual(String(provided), expected)) return { ok: false, reason: 'incorrect' }
  return { ok: true }
}

/** Comparação de PIN digitado com o emitido, em tempo constante. Use nas rotas de aprovação. */
export function pinMatches(provided: string | null | undefined, expected: string | null | undefined): boolean {
  if (!provided || !expected) return false
  return safeEqual(String(provided).trim(), String(expected).trim())
}

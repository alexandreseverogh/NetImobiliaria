import { timingSafeEqual } from 'crypto'
import type { NextRequest } from 'next/server'

/**
 * Chamadas servidor-a-servidor dentro da própria aplicação (webhooks de captura, CTA, WhatsApp).
 * Elas identificam-se com o segredo de servidor já configurado em todos os ambientes
 * (CRON_SECRET), no header x-internal-secret. Comparação em tempo constante.
 */
export const INTERNAL_SECRET_HEADER = 'x-internal-secret'

export function internalSecretValue(): string {
  return process.env.CRON_SECRET || ''
}

export function isInternalCall(request: NextRequest): boolean {
  const expected = internalSecretValue()
  if (!expected) return false
  const got = request.headers.get(INTERNAL_SECRET_HEADER) || ''
  const a = Buffer.from(got)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

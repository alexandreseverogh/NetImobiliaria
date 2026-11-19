import { createHmac, timingSafeEqual } from 'crypto'

/**
 * Token do widget de chat público. O servidor emite o token junto com a ficha do imóvel (que já
 * conhece o tenant) e o chat só aceita mensagens com um token válido. Assim o tenant nunca é
 * escolhido pelo navegador. Token = tenantId.expiracao.assinatura (HMAC-SHA256 com JWT_SECRET).
 */
const TTL_MS = 24 * 60 * 60 * 1000
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function secret(): string {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET ausente: não é possível emitir token do chat')
  return s
}

export function issuePublicChatToken(tenantId: string): string {
  const exp = String(Date.now() + TTL_MS)
  const payload = `${tenantId}.${exp}`
  const sig = createHmac('sha256', secret()).update(payload).digest('hex')
  return `${payload}.${sig}`
}

/** Devolve o tenantId do token, ou null se ausente, malformado, expirado ou adulterado. */
export function verifyPublicChatToken(token: string | null | undefined): string | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [tenantId, exp, sig] = parts
  if (!UUID_RE.test(tenantId)) return null
  const expMs = Number(exp)
  if (!Number.isFinite(expMs) || Date.now() > expMs) return null
  const expected = createHmac('sha256', secret()).update(`${tenantId}.${exp}`).digest('hex')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  return tenantId
}

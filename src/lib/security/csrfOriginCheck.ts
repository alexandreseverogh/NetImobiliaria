import { NextRequest } from 'next/server'

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

// Rotas chamadas de fora do navegador por natureza (webhooks Meta/Google/Evolution,
// endpoints de cron com x-cron-secret) — nunca têm Origin/Referer de navegador,
// não fazem sentido pra essa checagem e só gerariam ruído no log.
const EXCLUDED_PREFIXES = ['/api/public/', '/api/cron/']

function shouldCheckCsrfOrigin(pathname: string, method: string): boolean {
  if (!pathname.startsWith('/api/')) return false
  if (!STATE_CHANGING_METHODS.has(method)) return false
  if (EXCLUDED_PREFIXES.some(prefix => pathname.startsWith(prefix))) return false
  return true
}

/**
 * Fase 2 do plano de hardening (docs/CHECKPOINT.md) — defesa CSRF via Origin/Referer.
 * MODO LOG-ONLY: nunca bloqueia nada, só registra no log do servidor. Objetivo é
 * observar por um período o volume real de "bloquearia" vs. tráfego legítimo antes
 * de decidir a política de bloqueio de verdade (ex.: origem ausente é comum em
 * navegadores antigos/config de privacidade agressiva — não dá pra saber sem olhar
 * dado real primeiro).
 *
 * Compara o header Origin (ou Referer como fallback) com a origem real da aplicação,
 * vista pelo próprio Next.js via request.nextUrl.origin — deriva do Host/
 * X-Forwarded-Host, funciona automaticamente em dev e produção sem allowlist fixa
 * que poderia ficar desatualizada.
 */
export function logCsrfOriginCheck(request: NextRequest): void {
  const { pathname } = request.nextUrl
  const method = request.method

  if (!shouldCheckCsrfOrigin(pathname, method)) return

  const expectedOrigin = request.nextUrl.origin
  const originHeader = request.headers.get('origin')
  const refererHeader = request.headers.get('referer')

  let actualOrigin: string | null = originHeader
  if (!actualOrigin && refererHeader) {
    try {
      actualOrigin = new URL(refererHeader).origin
    } catch {
      actualOrigin = null
    }
  }

  if (!actualOrigin) {
    console.warn(`[CSRF-CHECK][sem-origin] ${method} ${pathname} — sem header Origin nem Referer`)
    return
  }

  if (actualOrigin !== expectedOrigin) {
    console.warn(`[CSRF-CHECK][MISMATCH] ${method} ${pathname} — Origin real: "${actualOrigin}" | esperado: "${expectedOrigin}"`)
  }
}

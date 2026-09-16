import { NextRequest, NextResponse } from 'next/server'
import { applyPublicRateLimit } from '@/lib/security/rate-limiter'

export const runtime = 'nodejs'

/**
 * Recebe relatórios automáticos de violação de CSP (Fase 1 do plano de hardening,
 * docs/CHECKPOINT.md) — o próprio navegador dispara este POST sozinho quando a CSP
 * (hoje em modo Report-Only, nunca bloqueia nada) detecta um recurso que a política
 * não permite. Objetivo: transformar "observar por um tempo" em algo automático —
 * só loga (console.warn, cai nos logs do processo/Docker), não persiste em tabela
 * nova, não bloqueia nada, não muda nenhum comportamento da aplicação.
 *
 * Público e sem autenticação de propósito: o navegador dispara esse POST de
 * QUALQUER página carregada, inclusive antes do login. Rate-limited (mesmo teto
 * de qualquer rota pública) pra não virar vetor de flood de log.
 */
export async function POST(request: NextRequest) {
  const limited = await applyPublicRateLimit(request)
  if (limited) return limited

  try {
    const body = await request.json().catch(() => null)
    const report = body?.['csp-report'] ?? body

    if (report && typeof report === 'object') {
      console.warn(
        `[CSP-VIOLATION] directive="${report['violated-directive'] ?? '?'}" ` +
        `blocked="${report['blocked-uri'] ?? '?'}" ` +
        `page="${report['document-uri'] ?? '?'}"`
      )
    } else {
      console.warn('[CSP-VIOLATION] relatório recebido em formato inesperado, ignorado')
    }
  } catch (error) {
    console.warn('[CSP-VIOLATION] erro ao processar relatório:', error)
  }

  // Browsers esperam 204 (sem corpo) como resposta padrão de endpoint de report.
  return new NextResponse(null, { status: 204 })
}

import { NextRequest } from 'next/server'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { subscribeMensageriaEvents } from '@/lib/mensageria/realtime'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/mensageria/stream
 * SSE (text/event-stream) — atualização ao vivo da inbox (nova mensagem, mudança de
 * status). Autentica via cookie admin_auth_token (EventSource do browser envia
 * cookies automaticamente em requisições same-origin).
 *
 * Se Redis não estiver disponível, o stream abre mas nunca emite eventos — a UI
 * segue funcional via polling/reload manual (degradação graciosa).
 *
 * Ver docs/PLANO_MENSAGERIA.md seção 6.
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return new Response('Não autenticado', { status: 401 })

  const tenantId = payload.tenantId
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try { controller.enqueue(encoder.encode(`data: ${data}\n\n`)) } catch { /* controller já fechado */ }
      }

      send(JSON.stringify({ type: 'connected' }))

      const subscriber = subscribeMensageriaEvents(tenantId, (event) => {
        send(JSON.stringify(event))
      })

      // heartbeat a cada 25s — mantém a conexão viva atrás de proxies/load balancers
      const heartbeat = setInterval(() => send(JSON.stringify({ type: 'ping' })), 25000)

      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat)
        subscriber?.disconnect()
        try { controller.close() } catch { /* já fechado */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}

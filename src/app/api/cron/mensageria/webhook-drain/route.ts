import { NextRequest, NextResponse } from 'next/server'
import { drainWebhookInbox } from '@/lib/mensageria/webhookInbox'
import { verifyCronSecret } from '@/lib/security/cronAuth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/mensageria/webhook-drain
 * Processa eventos da Evolution que ficaram pendentes na fila (mensageria.webhook_inbox):
 * processo que caiu, falha transitória ou reagendamento com backoff. Chamado a cada minuto
 * pelo feed-cron-scheduler. Protegido por CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (!verifyCronSecret(secret)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const result = await drainWebhookInbox({ batch: 50 })
  return NextResponse.json({ success: true, ...result })
}

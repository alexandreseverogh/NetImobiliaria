import { NextRequest, NextResponse } from 'next/server'
import { scanAndAlertBreaches } from '@/lib/mensageria/sla'

export const dynamic = 'force-dynamic'

/**
 * POST /api/cron/mensageria/sla-check
 * Varre TODAS as conversas com prazo de 1ª resposta estourado (todos os tenants,
 * pois a query já filtra por conversation_sla sem exigir tenant), marca o estouro
 * e dispara alerta (WhatsApp/Slack do tenant correspondente).
 * Protegido por CRON_SECRET, mesmo padrão dos demais crons do projeto.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const result = await scanAndAlertBreaches()
  return NextResponse.json({ success: true, ...result })
}

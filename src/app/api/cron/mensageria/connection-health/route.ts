import { NextRequest, NextResponse } from 'next/server'
import { checkWhatsappConnections } from '@/lib/mensageria/connectionHealth'
import { verifyCronSecret } from '@/lib/security/cronAuth'

export const dynamic = 'force-dynamic'

/** POST /api/cron/mensageria/connection-health — verifica as conexões de WhatsApp (a cada 5 min). */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request.headers.get('x-cron-secret'))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const result = await checkWhatsappConnections()
  return NextResponse.json({ success: true, ...result })
}

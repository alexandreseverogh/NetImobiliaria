import { NextRequest, NextResponse } from 'next/server'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { getLeadTimeline } from '@/lib/crm/leadTimeline'

/** GET /api/crm/leads/[leadUuid]/timeline — histórico unificado do lead (mensagens + atividades). */
export async function GET(request: NextRequest, { params }: { params: { leadUuid: string } }) {
  const payload = getTokenPayload(request)
  const tenantId = payload?.tenantId
  if (!tenantId) return NextResponse.json({ success: false, error: 'não autenticado' }, { status: 401 })

  try {
    const items = await getLeadTimeline(tenantId, params.leadUuid)
    return NextResponse.json({ success: true, items })
  } catch (err) {
    console.error('[leads/timeline] erro:', err)
    return NextResponse.json({ success: false, error: 'erro ao carregar histórico' }, { status: 500 })
  }
}

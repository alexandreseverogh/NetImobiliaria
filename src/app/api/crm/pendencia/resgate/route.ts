import { NextRequest, NextResponse } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { getRescueQueue } from '@/lib/crm/pendencia/rescueQueue'

/**
 * GET /api/crm/pendencia/resgate
 *
 * Fila de resgate (docs/PLANO_PENDENCIA_ATENDIMENTO.md §4, degrau 4): leads que estão
 * aguardando uma ação nossa e que a máquina NÃO conseguiu resolver sozinha — ou porque nunca
 * tiveram responsável, ou porque a escada de escalonamento foi até o fim sem sucesso.
 *
 * Antes disso esse estado era completamente silencioso: o lead simplesmente não aparecia em
 * lugar nenhum. A UI que consome esta rota é a G4.
 */

function getCurrentUser(request: NextRequest): { userId: string; tenantId?: string; is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('admin_auth_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return null
    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null
    return { userId: decoded.userId, tenantId: decoded.tenantId, is_system_role: decoded.is_system_role === true }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const isMaster = currentUser.is_system_role === true
    // Master pode inspecionar outro tenant; tenant comum nunca sai do próprio escopo.
    const tenantId = isMaster ? (searchParams.get('tenant_id') || currentUser.tenantId) : currentUser.tenantId
    if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })

    const fila = await getRescueQueue(tenantId, searchParams.get('client_id'))

    return NextResponse.json({
      success: true,
      total: fila.length,
      semResponsavel: fila.filter((f) => f.motivo === 'sem_responsavel').length,
      fila,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { getLatestNextBestAction, refreshNextBestAction } from '@/lib/crm/agents/nextBestActionService'

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

async function resolveLeadScope(leadUuid: string, currentUser: { tenantId?: string; is_system_role?: boolean }) {
  const isMaster = currentUser.is_system_role === true
  const { rows } = await pool.query(
    `SELECT tenant_id, client_id FROM leads_staging WHERE lead_uuid = $1::uuid ${!isMaster ? 'AND tenant_id = $2::uuid' : ''}`,
    !isMaster ? [leadUuid, currentUser.tenantId] : [leadUuid],
  )
  return rows[0] ? { tenantId: rows[0].tenant_id as string, clientId: (rows[0].client_id as string | null) ?? null } : null
}

/** GET — última sugestão já persistida (sem chamar LLM), pra carregar a ficha do lead sem custo. */
export async function GET(request: NextRequest, { params }: { params: { leadUuid: string } }) {
  const currentUser = getCurrentUser(request)
  if (!currentUser) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })

  const scope = await resolveLeadScope(params.leadUuid, currentUser)
  if (!scope) return NextResponse.json({ success: false, error: 'Lead não encontrado ou sem permissão.' }, { status: 404 })

  const state = await getLatestNextBestAction(scope.tenantId, params.leadUuid, scope.clientId)
  return NextResponse.json({ success: true, ...state })
}

/** POST — força uma sugestão nova via LLM (botão "Atualizar sugestão"). */
export async function POST(request: NextRequest, { params }: { params: { leadUuid: string } }) {
  const currentUser = getCurrentUser(request)
  if (!currentUser) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })

  const scope = await resolveLeadScope(params.leadUuid, currentUser)
  if (!scope) return NextResponse.json({ success: false, error: 'Lead não encontrado ou sem permissão.' }, { status: 404 })

  try {
    const state = await refreshNextBestAction(scope.tenantId, params.leadUuid, scope.clientId)
    return NextResponse.json({ success: true, ...state })
  } catch (err: any) {
    console.error('[next-best-action] Erro ao gerar sugestão:', err)
    return NextResponse.json({ success: false, error: 'Não foi possível gerar a sugestão agora.' }, { status: 500 })
  }
}

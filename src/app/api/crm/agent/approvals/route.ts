import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { approveReactivation, rejectReactivation, getReactivationAction } from '@/lib/crm/agents/reactivationExecutor'

/**
 * F4 — fila de aprovações do agente `reactivation` DENTRO do CRM autenticado (plano §5,
 * "Aprovações Pendentes" em /crm/config/agentes) — mesma decisão do fluxo PIN
 * (src/app/api/crm/agent/approve|reject/[id]/route.ts), só que sem PIN: a sessão JWT já
 * prova identidade, mesmo padrão de /api/admin/master/aprovacoes (Campanhas) pro
 * equivalente autenticado do fluxo por link de WhatsApp.
 */

function getCurrentUser(request: NextRequest): { userId: string, tenantId?: string, is_system_role?: boolean } | null {
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
    const isMaster = currentUser.is_system_role === true

    const { searchParams } = new URL(request.url)
    const tenantId = isMaster ? (searchParams.get('tenant_id') || currentUser.tenantId) : currentUser.tenantId
    if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })

    const status = searchParams.get('status') || 'PENDING_APPROVAL'

    const { rows } = await pool.query(
      `SELECT caa.id, caa.lead_uuid, caa.agent_key, caa.title, caa.description,
              caa.suggested_message, caa.confidence, caa.status, caa.approval_pin_exp,
              caa.created_at, caa.executed_at,
              ls.nome AS lead_nome, ls.telefone AS lead_telefone
         FROM public.crm_agent_actions caa
         JOIN public.leads_staging ls ON ls.lead_uuid = caa.lead_uuid
        WHERE caa.tenant_id = $1::uuid AND caa.type = 'OFFENSIVE' AND caa.status = $2
        ORDER BY caa.created_at DESC
        LIMIT 100`,
      [tenantId, status],
    )

    return NextResponse.json({
      success: true,
      actions: rows.map((r) => ({
        id: r.id,
        leadUuid: r.lead_uuid,
        agentKey: r.agent_key,
        title: r.title,
        description: r.description,
        suggestedMessage: r.suggested_message,
        confidence: r.confidence,
        status: r.status,
        approvalPinExp: r.approval_pin_exp,
        createdAt: r.created_at,
        executedAt: r.executed_at,
        leadNome: r.lead_nome,
        leadTelefone: r.lead_telefone,
      })),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser?.tenantId && !currentUser?.is_system_role) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { id, decision, editedMessage } = body as { id: string, decision: 'approve' | 'reject', editedMessage?: string }
    if (!id || (decision !== 'approve' && decision !== 'reject')) {
      return NextResponse.json({ error: 'id e decision ("approve"|"reject") são obrigatórios' }, { status: 400 })
    }

    // Nunca confia no tenant_id do body — sempre resolve a ação real e compara contra o
    // tenant da sessão (Master bypassa, mesmo padrão do resto da plataforma).
    const action = await getReactivationAction(id)
    if (!action) return NextResponse.json({ error: 'Ação não encontrada' }, { status: 404 })
    if (!currentUser.is_system_role && action.tenantId !== currentUser.tenantId) {
      return NextResponse.json({ error: 'Ação não pertence a este tenant' }, { status: 403 })
    }

    if (decision === 'reject') {
      await rejectReactivation(id)
      return NextResponse.json({ success: true, outcome: 'rejected' })
    }

    const result = await approveReactivation(id, editedMessage)
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

function getCurrentUser(request: NextRequest): { userId: string, tenantId?: string, is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('admin_auth_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return null

    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null

    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      is_system_role: decoded.is_system_role === true
    }
  } catch (error) {
    return null
  }
}

/**
 * CRM KANBAN MOVE API
 * Move um lead de uma coluna para outra no pipeline do Kanban.
 * Incremental: apenas atualiza a referência de coluna em leads_kanban.
 */

export async function POST(request: NextRequest) {
  try {
    const { lead_uuid, coluna_id } = await request.json()

    if (!lead_uuid || !coluna_id) {
      return NextResponse.json(
        { success: false, error: 'lead_uuid e coluna_id são obrigatórios.' },
        { status: 400 }
      )
    }

    const currentUser = getCurrentUser(request)
    const tenantId = currentUser?.tenantId || null
    const isMaster = currentUser?.is_system_role === true

    // Verificar se o lead existe e pertence ao tenant
    const leadCheck = await pool.query(
      `SELECT lead_uuid, tenant_id FROM leads_staging WHERE lead_uuid = $1 ${!isMaster ? 'AND tenant_id = $2' : ''}`,
      !isMaster ? [lead_uuid, tenantId] : [lead_uuid]
    )
    if (leadCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Lead não encontrado ou sem permissão.' },
        { status: 404 }
      )
    }

    const leadTenantId = leadCheck.rows[0].tenant_id

    // Verificar se a coluna destino existe e está ativa (no tenant correto)
    const colCheck = await pool.query(
      `SELECT id, nome FROM kanban_colunas WHERE id = $1 AND ativa = true ${!isMaster ? 'AND tenant_id = $2' : ''}`,
      !isMaster ? [coluna_id, tenantId] : [coluna_id]
    )
    if (colCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Coluna destino não encontrada ou inativa para este tenant.' },
        { status: 404 }
      )
    }

    // Mover o lead (UPSERT para segurança)
    await pool.query(
      `INSERT INTO leads_kanban (lead_uuid, coluna_id, tenant_id, data_movimentacao) 
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (lead_uuid) 
       DO UPDATE SET coluna_id = $2, tenant_id = $3, data_movimentacao = NOW()`,
      [lead_uuid, coluna_id, leadTenantId]
    )

    // Atualizar status do lead na staging para refletir o estágio
    const colNome = colCheck.rows[0].nome
    await pool.query(
      `UPDATE leads_staging SET status = $1, updated_at = NOW() WHERE lead_uuid = $2`,
      [colNome, lead_uuid]
    )

    console.log(`[KanbanMove] Lead ${lead_uuid} movido para coluna ${colNome} (id: ${coluna_id})`)

    return NextResponse.json({
      success: true,
      message: `Lead movido para "${colCheck.rows[0].nome}" com sucesso.`
    })

  } catch (error: any) {
    console.error('❌ [KanbanMove] Erro:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

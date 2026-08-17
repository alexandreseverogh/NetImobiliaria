import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

/**
 * Exclusão/restauração de lead — regra de negócio decidida pelo usuário (docs/CHECKPOINT.md,
 * 2026-08-14): lead SEM nenhuma atividade registrada é excluído permanentemente (a tabela já
 * tem FK ON DELETE CASCADE pra tudo relacionado); lead COM atividade é excluído de forma
 * reversível (soft-delete, leads_staging.deleted_at) e pode ser restaurado depois.
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

async function resolveLeadScope(leadUuid: string, currentUser: { tenantId?: string; is_system_role?: boolean }) {
  const isMaster = currentUser.is_system_role === true
  const { rows } = await pool.query(
    `SELECT tenant_id, deleted_at FROM leads_staging WHERE lead_uuid = $1::uuid ${!isMaster ? 'AND tenant_id = $2::uuid' : ''}`,
    !isMaster ? [leadUuid, currentUser.tenantId] : [leadUuid],
  )
  return rows[0] ? { tenantId: rows[0].tenant_id as string, deletedAt: rows[0].deleted_at as string | null } : null
}

/** DELETE — sem atividade registrada: apaga de vez. Com atividade: soft-delete (reversível). */
export async function DELETE(request: NextRequest, { params }: { params: { leadUuid: string } }) {
  const currentUser = getCurrentUser(request)
  if (!currentUser) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })

  const scope = await resolveLeadScope(params.leadUuid, currentUser)
  if (!scope) return NextResponse.json({ success: false, error: 'Lead não encontrado ou sem permissão.' }, { status: 404 })
  if (scope.deletedAt) return NextResponse.json({ success: false, error: 'Este lead já está excluído.' }, { status: 409 })

  try {
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM atividades_lead WHERE lead_uuid = $1::uuid AND deleted_at IS NULL`,
      [params.leadUuid],
    )
    const temAtividade = countRows[0].total > 0

    if (temAtividade) {
      await pool.query(
        `UPDATE leads_staging SET deleted_at = NOW() WHERE lead_uuid = $1::uuid`,
        [params.leadUuid],
      )
      return NextResponse.json({ success: true, mode: 'soft', message: 'Lead movido para a lixeira (tem atividades registradas) — pode ser restaurado.' })
    }

    // Sem atividade nenhuma — exclusão real, em cascata (FK já cobre tudo relacionado).
    await pool.query(`DELETE FROM leads_staging WHERE lead_uuid = $1::uuid`, [params.leadUuid])
    return NextResponse.json({ success: true, mode: 'hard', message: 'Lead excluído permanentemente.' })
  } catch (error: any) {
    console.error('[crm/leads/:leadUuid DELETE]', error)
    return NextResponse.json({ success: false, error: 'Erro ao excluir lead.' }, { status: 500 })
  }
}

/** PATCH { action: 'restore' } — desfaz o soft-delete. */
export async function PATCH(request: NextRequest, { params }: { params: { leadUuid: string } }) {
  const currentUser = getCurrentUser(request)
  if (!currentUser) return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })

  const scope = await resolveLeadScope(params.leadUuid, currentUser)
  if (!scope) return NextResponse.json({ success: false, error: 'Lead não encontrado ou sem permissão.' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  if (body?.action !== 'restore') {
    return NextResponse.json({ success: false, error: "Ação inválida — use { action: 'restore' }." }, { status: 400 })
  }
  if (!scope.deletedAt) {
    return NextResponse.json({ success: false, error: 'Este lead não está excluído.' }, { status: 409 })
  }

  await pool.query(`UPDATE leads_staging SET deleted_at = NULL WHERE lead_uuid = $1::uuid`, [params.leadUuid])
  return NextResponse.json({ success: true, message: 'Lead restaurado.' })
}

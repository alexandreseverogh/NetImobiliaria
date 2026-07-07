import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/admin/mensageria/inboxes/[id] — vincula/desvincula o time responsável.
 * Body: { teamId: string | null }
 *
 * `teamId` alimenta autoAssignConversation() (ver src/lib/mensageria/autoAssign.ts):
 * toda conversa NOVA nesta inbox passa a ser distribuída automaticamente ao membro
 * menos carregado do time, desde que team.auto_assign=true. Sem este vínculo, a
 * auto-atribuição nunca dispara — a inbox fica só com atribuição manual.
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const teamId: string | null = body.teamId ?? null

  if (teamId) {
    const { rows: team } = await pool.query(
      `SELECT id FROM mensageria.teams WHERE id = $1 AND tenant_id = $2`,
      [teamId, payload.tenantId],
    )
    if (!team[0]) return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 })
  }

  const { rows } = await pool.query(
    `UPDATE mensageria.inboxes SET team_id = $1 WHERE id = $2 AND tenant_id = $3 RETURNING id, team_id`,
    [teamId, params.id, payload.tenantId],
  )
  if (!rows[0]) return NextResponse.json({ error: 'Inbox não encontrada' }, { status: 404 })

  return NextResponse.json({ success: true, inboxId: rows[0].id, teamId: rows[0].team_id })
}

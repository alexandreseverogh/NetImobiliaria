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
      `SELECT id, client_id FROM mensageria.teams WHERE id = $1 AND tenant_id = $2`,
      [teamId, payload.tenantId],
    )
    if (!team[0]) return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 })

    // Um time dedicado a um cliente (client_id setado) nunca pode ser vinculado à inbox de OUTRO
    // cliente (nem à inbox tenant-wide) — só inboxes do mesmo cliente, ou time sem dono (atende
    // qualquer cliente). Inconsistência aqui é o tipo de erro que fica invisível até um agente
    // do cliente A receber conversa real do cliente B.
    if (team[0].client_id) {
      const { rows: ib } = await pool.query(`SELECT client_id FROM mensageria.inboxes WHERE id = $1 AND tenant_id = $2`, [params.id, payload.tenantId])
      if (!ib[0]) return NextResponse.json({ error: 'Inbox não encontrada' }, { status: 404 })
      if (ib[0].client_id !== team[0].client_id) {
        return NextResponse.json({ error: 'Este time é dedicado a outro cliente — não pode ser vinculado a esta inbox.' }, { status: 400 })
      }
    }
  }

  const { rows } = await pool.query(
    `UPDATE mensageria.inboxes SET team_id = $1 WHERE id = $2 AND tenant_id = $3 RETURNING id, team_id`,
    [teamId, params.id, payload.tenantId],
  )
  if (!rows[0]) return NextResponse.json({ error: 'Inbox não encontrada' }, { status: 404 })

  return NextResponse.json({ success: true, inboxId: rows[0].id, teamId: rows[0].team_id })
}

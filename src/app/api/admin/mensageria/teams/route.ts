import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/** GET /api/admin/mensageria/teams — lista times do tenant com membros */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows: teams } = await pool.query(
    `SELECT t.id, t.name, t.auto_assign, t.client_id, cl.nome AS client_name
       FROM mensageria.teams t
       LEFT JOIN public.clientes cl ON cl.uuid = t.client_id
      WHERE t.tenant_id = $1 ORDER BY t.name`,
    [payload.tenantId],
  )
  // Efeito real de cada time: quantas inboxes ele atende e quantas conversas estão atribuídas a ele.
  // Sem isso a aba não mostra se a configuração de time faz alguma coisa.
  const { rows: usage } = await pool.query(
    `SELECT t.id,
            (SELECT COUNT(*)::int FROM mensageria.inboxes i WHERE i.team_id = t.id) AS inbox_count,
            (SELECT COALESCE(json_agg(i.name ORDER BY i.name), '[]'::json)
               FROM mensageria.inboxes i WHERE i.team_id = t.id) AS inbox_names,
            (SELECT COUNT(*)::int FROM mensageria.conversations c WHERE c.team_id = t.id AND c.status = 'open') AS open_count,
            (SELECT COUNT(*)::int FROM mensageria.conversations c WHERE c.team_id = t.id AND c.status = 'pending') AS pending_count,
            (SELECT COUNT(*)::int FROM mensageria.conversations c WHERE c.team_id = t.id) AS conversation_count
       FROM mensageria.teams t
      WHERE t.tenant_id = $1`,
    [payload.tenantId],
  )
  const usageById = new Map(usage.map((u) => [u.id, u]))
  const { rows: members } = await pool.query(
    `SELECT tm.team_id, tm.user_id, tm.role, u.nome
       FROM mensageria.team_members tm
       JOIN public.users u ON u.id = tm.user_id
      WHERE tm.team_id = ANY($1::uuid[])`,
    [teams.map((t) => t.id)],
  )

  return NextResponse.json({
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      autoAssign: t.auto_assign,
      clientId: t.client_id,
      clientName: t.client_name,
      inboxCount: usageById.get(t.id)?.inbox_count ?? 0,
      inboxNames: (usageById.get(t.id)?.inbox_names as string[]) ?? [],
      openCount: usageById.get(t.id)?.open_count ?? 0,
      pendingCount: usageById.get(t.id)?.pending_count ?? 0,
      conversationCount: usageById.get(t.id)?.conversation_count ?? 0,
      members: members.filter((m) => m.team_id === t.id).map((m) => ({ userId: m.user_id, name: m.nome, role: m.role })),
    })),
  })
}

/** POST /api/admin/mensageria/teams — cria time. Body: { name, autoAssign?, clientId? } */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name: string = (body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  const clientId: string | null = body.clientId || null
  if (clientId) {
    const { rows: own } = await pool.query(`SELECT 1 FROM public.clientes WHERE uuid = $1 AND tenant_id = $2`, [clientId, payload.tenantId])
    if (own.length === 0) return NextResponse.json({ error: 'Cliente não encontrado neste tenant' }, { status: 400 })
  }

  const { rows } = await pool.query(
    `INSERT INTO mensageria.teams (tenant_id, client_id, name, auto_assign) VALUES ($1, $2, $3, $4)
     RETURNING id, name, auto_assign`,
    [payload.tenantId, clientId, name, body.autoAssign !== false],
  )
  return NextResponse.json({ team: { ...rows[0], clientId, clientName: null } })
}

/** PATCH /api/admin/mensageria/teams?id=... — altera auto-atribuição. Body: { autoAssign: boolean } */
export async function PATCH(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  if (typeof body.autoAssign !== 'boolean') {
    return NextResponse.json({ error: 'autoAssign deve ser booleano' }, { status: 400 })
  }

  const { rows } = await pool.query(
    `UPDATE mensageria.teams SET auto_assign = $1 WHERE id = $2 AND tenant_id = $3 RETURNING id, auto_assign`,
    [body.autoAssign, id, payload.tenantId],
  )
  if (rows.length === 0) return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 })
  return NextResponse.json({ team: { id: rows[0].id, autoAssign: rows[0].auto_assign } })
}

/** DELETE /api/admin/mensageria/teams?id=... */
export async function DELETE(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  await pool.query(`DELETE FROM mensageria.teams WHERE id = $1 AND tenant_id = $2`, [id, payload.tenantId])
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/** GET /api/admin/mensageria/teams — lista times do tenant com membros */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows: teams } = await pool.query(
    `SELECT id, name, auto_assign FROM mensageria.teams WHERE tenant_id = $1 ORDER BY name`,
    [payload.tenantId],
  )
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
      members: members.filter((m) => m.team_id === t.id).map((m) => ({ userId: m.user_id, name: m.nome, role: m.role })),
    })),
  })
}

/** POST /api/admin/mensageria/teams — cria time. Body: { name, autoAssign? } */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name: string = (body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

  const { rows } = await pool.query(
    `INSERT INTO mensageria.teams (tenant_id, name, auto_assign) VALUES ($1, $2, $3)
     RETURNING id, name, auto_assign`,
    [payload.tenantId, name, body.autoAssign !== false],
  )
  return NextResponse.json({ team: rows[0] })
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

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/** POST /api/admin/mensageria/teams/[id]/members — adiciona membro. Body: { userId, role? } */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { userId, role = 'agent' } = body
  if (!userId) return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })

  const { rows: team } = await pool.query(
    `SELECT id FROM mensageria.teams WHERE id = $1 AND tenant_id = $2`,
    [params.id, payload.tenantId],
  )
  if (!team[0]) return NextResponse.json({ error: 'Time não encontrado' }, { status: 404 })

  await pool.query(
    `INSERT INTO mensageria.team_members (team_id, user_id, role) VALUES ($1, $2, $3)
     ON CONFLICT (team_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
    [params.id, userId, role],
  )
  return NextResponse.json({ success: true })
}

/** DELETE /api/admin/mensageria/teams/[id]/members?userId=... */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const userId = new URL(request.url).searchParams.get('userId')
  if (!userId) return NextResponse.json({ error: 'userId é obrigatório' }, { status: 400 })

  await pool.query(
    `DELETE FROM mensageria.team_members
      WHERE team_id = $1 AND user_id = $2
        AND team_id IN (SELECT id FROM mensageria.teams WHERE tenant_id = $3)`,
    [params.id, userId, payload.tenantId],
  )
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/** GET /api/admin/mensageria/labels — lista etiquetas do tenant */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT id, name, color FROM mensageria.labels WHERE tenant_id = $1 ORDER BY name`,
    [payload.tenantId],
  )
  return NextResponse.json({ labels: rows })
}

/** POST /api/admin/mensageria/labels — cria etiqueta. Body: { name, color? } */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name: string = (body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  const color = body.color || '#c5a028'

  const { rows } = await pool.query(
    `INSERT INTO mensageria.labels (tenant_id, name, color) VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, name) DO UPDATE SET color = EXCLUDED.color
     RETURNING id, name, color`,
    [payload.tenantId, name, color],
  )
  return NextResponse.json({ label: rows[0] })
}

/** DELETE /api/admin/mensageria/labels?id=... */
export async function DELETE(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  await pool.query(`DELETE FROM mensageria.labels WHERE id = $1 AND tenant_id = $2`, [id, payload.tenantId])
  return NextResponse.json({ success: true })
}

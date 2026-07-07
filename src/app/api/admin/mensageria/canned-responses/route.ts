import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/** GET /api/admin/mensageria/canned-responses — lista respostas rápidas do tenant */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT id, shortcut, content FROM mensageria.canned_responses WHERE tenant_id = $1 ORDER BY shortcut`,
    [payload.tenantId],
  )
  return NextResponse.json({ cannedResponses: rows })
}

/** POST /api/admin/mensageria/canned-responses — cria. Body: { shortcut, content } */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  let shortcut: string = (body.shortcut || '').trim().toLowerCase()
  const content: string = (body.content || '').trim()
  if (!shortcut || !content) return NextResponse.json({ error: 'shortcut e content são obrigatórios' }, { status: 400 })
  if (!shortcut.startsWith('/')) shortcut = `/${shortcut}`

  const { rows } = await pool.query(
    `INSERT INTO mensageria.canned_responses (tenant_id, shortcut, content) VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, shortcut) DO UPDATE SET content = EXCLUDED.content
     RETURNING id, shortcut, content`,
    [payload.tenantId, shortcut, content],
  )
  return NextResponse.json({ cannedResponse: rows[0] })
}

/** DELETE /api/admin/mensageria/canned-responses?id=... */
export async function DELETE(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  await pool.query(`DELETE FROM mensageria.canned_responses WHERE id = $1 AND tenant_id = $2`, [id, payload.tenantId])
  return NextResponse.json({ success: true })
}

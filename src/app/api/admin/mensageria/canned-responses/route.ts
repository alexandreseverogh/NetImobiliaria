import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/mensageria/canned-responses — lista respostas rápidas do tenant. `?clientId=`
 * (opcional) filtra pras aplicáveis a uma conversa daquele cliente (tenant-wide + as dele); sem
 * o param, devolve TODAS (uso na tela de gestão).
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const clientId = new URL(request.url).searchParams.get('clientId')
  const params: any[] = [payload.tenantId]
  let clientClause = ''
  if (clientId) {
    params.push(clientId)
    clientClause = ` AND (cr.client_id IS NULL OR cr.client_id = $2)`
  }

  const { rows } = await pool.query(
    `SELECT cr.id, cr.shortcut, cr.content, cr.client_id, cl.nome AS client_name
       FROM mensageria.canned_responses cr
       LEFT JOIN public.clientes cl ON cl.uuid = cr.client_id
      WHERE cr.tenant_id = $1${clientClause} ORDER BY cr.shortcut`,
    params,
  )
  return NextResponse.json({
    cannedResponses: rows.map((r) => ({ id: r.id, shortcut: r.shortcut, content: r.content, clientId: r.client_id, clientName: r.client_name })),
  })
}

/** POST /api/admin/mensageria/canned-responses — cria/atualiza. Body: { shortcut, content, clientId? } */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  let shortcut: string = (body.shortcut || '').trim().toLowerCase()
  const content: string = (body.content || '').trim()
  if (!shortcut || !content) return NextResponse.json({ error: 'shortcut e content são obrigatórios' }, { status: 400 })
  if (!shortcut.startsWith('/')) shortcut = `/${shortcut}`
  const clientId: string | null = body.clientId || null
  if (clientId) {
    const { rows: own } = await pool.query(`SELECT 1 FROM public.clientes WHERE uuid = $1 AND tenant_id = $2`, [clientId, payload.tenantId])
    if (own.length === 0) return NextResponse.json({ error: 'Cliente não encontrado neste tenant' }, { status: 400 })
  }

  const { rows } = await pool.query(
    `INSERT INTO mensageria.canned_responses (tenant_id, client_id, shortcut, content) VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id, (COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid)), shortcut)
     DO UPDATE SET content = EXCLUDED.content
     RETURNING id, shortcut, content`,
    [payload.tenantId, clientId, shortcut, content],
  )
  return NextResponse.json({ cannedResponse: { ...rows[0], clientId, clientName: null } })
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

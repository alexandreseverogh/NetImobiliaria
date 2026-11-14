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

  // Atalho já existente no mesmo escopo é recusado (409), e não sobrescreve o texto em silêncio.
  // Para alterar um atalho existente, use PATCH.
  try {
    const { rows } = await pool.query(
      `INSERT INTO mensageria.canned_responses (tenant_id, client_id, shortcut, content) VALUES ($1, $2, $3, $4)
       RETURNING id, shortcut, content`,
      [payload.tenantId, clientId, shortcut, content],
    )
    return NextResponse.json({ cannedResponse: { ...rows[0], clientId, clientName: null } })
  } catch (err: any) {
    if (err?.code === '23505') {
      return NextResponse.json({ error: `Já existe a resposta "${shortcut}" neste escopo.` }, { status: 409 })
    }
    throw err
  }
}

/** PATCH /api/admin/mensageria/canned-responses?id=... — altera atalho e/ou texto. Body: { shortcut?, content? } */
export async function PATCH(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  const body = await request.json().catch(() => ({}))
  const sets: string[] = []
  const args: any[] = []
  if (body.shortcut !== undefined) {
    let shortcut: string = String(body.shortcut).trim().toLowerCase()
    if (!shortcut) return NextResponse.json({ error: 'shortcut não pode ser vazio' }, { status: 400 })
    if (!shortcut.startsWith('/')) shortcut = `/${shortcut}`
    args.push(shortcut); sets.push(`shortcut = $${args.length}`)
  }
  if (body.content !== undefined) {
    const content: string = String(body.content).trim()
    if (!content) return NextResponse.json({ error: 'content não pode ser vazio' }, { status: 400 })
    args.push(content); sets.push(`content = $${args.length}`)
  }
  if (sets.length === 0) return NextResponse.json({ error: 'Nada para alterar' }, { status: 400 })

  args.push(id, payload.tenantId)
  try {
    const { rows } = await pool.query(
      `UPDATE mensageria.canned_responses SET ${sets.join(', ')}
        WHERE id = $${args.length - 1} AND tenant_id = $${args.length}
        RETURNING id, shortcut, content`,
      args,
    )
    if (rows.length === 0) return NextResponse.json({ error: 'Resposta não encontrada' }, { status: 404 })
    return NextResponse.json({ cannedResponse: rows[0] })
  } catch (err: any) {
    if (err?.code === '23505') {
      return NextResponse.json({ error: 'Já existe outra resposta com esse atalho neste escopo.' }, { status: 409 })
    }
    throw err
  }
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

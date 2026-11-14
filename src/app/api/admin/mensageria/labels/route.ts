import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/mensageria/labels — lista etiquetas do tenant. `?clientId=` (opcional) filtra
 * pras aplicáveis a uma conversa daquele cliente (tenant-wide + as dele); sem o param, devolve
 * TODAS (uso na tela de gestão, onde o admin precisa ver/editar tudo junto).
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const clientId = new URL(request.url).searchParams.get('clientId')
  const params: any[] = [payload.tenantId]
  let clientClause = ''
  if (clientId) {
    params.push(clientId)
    clientClause = ` AND (l.client_id IS NULL OR l.client_id = $2)`
  }

  const { rows } = await pool.query(
    `SELECT l.id, l.name, l.color, l.client_id, cl.nome AS client_name
       FROM mensageria.labels l
       LEFT JOIN public.clientes cl ON cl.uuid = l.client_id
      WHERE l.tenant_id = $1${clientClause} ORDER BY l.name`,
    params,
  )
  return NextResponse.json({
    labels: rows.map((r) => ({ id: r.id, name: r.name, color: r.color, clientId: r.client_id, clientName: r.client_name })),
  })
}

/** POST /api/admin/mensageria/labels — cria/atualiza etiqueta. Body: { name, color?, clientId? } */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name: string = (body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  const color = body.color || '#c5a028'
  const clientId: string | null = body.clientId || null
  if (clientId) {
    const { rows: own } = await pool.query(`SELECT 1 FROM public.clientes WHERE uuid = $1 AND tenant_id = $2`, [clientId, payload.tenantId])
    if (own.length === 0) return NextResponse.json({ error: 'Cliente não encontrado neste tenant' }, { status: 400 })
  }

  // Nome já existente no mesmo escopo é recusado (409), e não sobrescreve a cor em silêncio.
  // Para trocar a cor de uma etiqueta existente, use PATCH.
  try {
    const { rows } = await pool.query(
      `INSERT INTO mensageria.labels (tenant_id, client_id, name, color) VALUES ($1, $2, $3, $4)
       RETURNING id, name, color`,
      [payload.tenantId, clientId, name, color],
    )
    return NextResponse.json({ label: { ...rows[0], clientId, clientName: null } })
  } catch (err: any) {
    if (err?.code === '23505') {
      return NextResponse.json({ error: `Já existe uma etiqueta "${name}" neste escopo.` }, { status: 409 })
    }
    throw err
  }
}

/** PATCH /api/admin/mensageria/labels?id=... — altera a cor de uma etiqueta existente. Body: { color } */
export async function PATCH(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })
  const body = await request.json().catch(() => ({}))
  const color: string = (body.color || '').trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return NextResponse.json({ error: 'Cor inválida' }, { status: 400 })

  const { rows } = await pool.query(
    `UPDATE mensageria.labels SET color = $1 WHERE id = $2 AND tenant_id = $3 RETURNING id, name, color`,
    [color, id, payload.tenantId],
  )
  if (rows.length === 0) return NextResponse.json({ error: 'Etiqueta não encontrada' }, { status: 404 })
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

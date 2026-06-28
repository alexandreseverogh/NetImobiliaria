import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'
const SCHEMA = 'campanhasmarketingdigital'

/** PUT /api/admin/campanhas/destinos/{id} — atualiza nome/config/cta/ativo */
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const sets: string[] = []
  const args: any[] = []
  const set = (col: string, val: any, cast = '') => {
    args.push(val)
    sets.push(`${col} = $${args.length}${cast}`)
  }
  if (body.name !== undefined) set('name', body.name)
  if (body.type !== undefined) set('type', body.type)
  if (body.cta_type !== undefined) set('cta_type', body.cta_type)
  if (body.config !== undefined) set('config', JSON.stringify(body.config), '::jsonb')
  if (body.is_active !== undefined) set('is_active', body.is_active)
  if (sets.length === 0) return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })

  sets.push('updated_at = now()')
  args.push(params.id, payload.tenantId)
  const { rows } = await pool.query(
    `UPDATE ${SCHEMA}."CtaDestination" SET ${sets.join(', ')}
      WHERE id = $${args.length - 1} AND tenant_id = $${args.length}
      RETURNING id, name, slug, type, cta_type, config, is_active, client_id`,
    args,
  )
  if (rows.length === 0) return NextResponse.json({ error: 'Destino não encontrado' }, { status: 404 })
  return NextResponse.json({ success: true, destino: rows[0] })
}

/** DELETE /api/admin/campanhas/destinos/{id} — desativa (soft delete) */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rowCount } = await pool.query(
    `UPDATE ${SCHEMA}."CtaDestination" SET is_active = false, updated_at = now()
      WHERE id = $1 AND tenant_id = $2`,
    [params.id, payload.tenantId],
  )
  if (!rowCount) return NextResponse.json({ error: 'Destino não encontrado' }, { status: 404 })
  return NextResponse.json({ success: true })
}

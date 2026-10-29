import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/** GET /api/admin/mensageria/sla-policies — lista políticas do tenant */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT p.id, p.name, p.scope, p.first_response_target_min, p.resolution_target_min, p.is_active,
            p.client_id, cl.nome AS client_name
       FROM mensageria.sla_policies p
       LEFT JOIN public.clientes cl ON cl.uuid = p.client_id
      WHERE p.tenant_id = $1 ORDER BY p.name`,
    [payload.tenantId],
  )
  return NextResponse.json({
    policies: rows.map((r) => ({
      id: r.id, name: r.name, scope: r.scope,
      first_response_target_min: r.first_response_target_min, resolution_target_min: r.resolution_target_min,
      is_active: r.is_active, clientId: r.client_id, clientName: r.client_name,
    })),
  })
}

/**
 * POST /api/admin/mensageria/sla-policies — cria política.
 * Body: { name, scope?: {inbox_id?, team_id?}, firstResponseTargetMin?, resolutionTargetMin?, clientId? }
 */
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
    `INSERT INTO mensageria.sla_policies
       (tenant_id, client_id, name, scope, first_response_target_min, resolution_target_min)
     VALUES ($1, $2, $3, $4::jsonb, $5, $6)
     RETURNING id, name, scope, first_response_target_min, resolution_target_min, is_active`,
    [
      payload.tenantId, clientId, name, JSON.stringify(body.scope || {}),
      body.firstResponseTargetMin ?? null, body.resolutionTargetMin ?? null,
    ],
  )
  return NextResponse.json({ policy: { ...rows[0], clientId, clientName: null } })
}

/** DELETE /api/admin/mensageria/sla-policies?id=... */
export async function DELETE(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  await pool.query(`DELETE FROM mensageria.sla_policies WHERE id = $1 AND tenant_id = $2`, [id, payload.tenantId])
  return NextResponse.json({ success: true })
}

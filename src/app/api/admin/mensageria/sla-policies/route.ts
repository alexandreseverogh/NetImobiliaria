import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/** GET /api/admin/mensageria/sla-policies — lista políticas do tenant */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT id, name, scope, first_response_target_min, resolution_target_min, is_active
       FROM mensageria.sla_policies WHERE tenant_id = $1 ORDER BY name`,
    [payload.tenantId],
  )
  return NextResponse.json({ policies: rows })
}

/**
 * POST /api/admin/mensageria/sla-policies — cria política.
 * Body: { name, scope?: {inbox_id?, team_id?}, firstResponseTargetMin?, resolutionTargetMin? }
 */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const name: string = (body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })

  const { rows } = await pool.query(
    `INSERT INTO mensageria.sla_policies
       (tenant_id, name, scope, first_response_target_min, resolution_target_min)
     VALUES ($1, $2, $3::jsonb, $4, $5)
     RETURNING id, name, scope, first_response_target_min, resolution_target_min, is_active`,
    [
      payload.tenantId, name, JSON.stringify(body.scope || {}),
      body.firstResponseTargetMin ?? null, body.resolutionTargetMin ?? null,
    ],
  )
  return NextResponse.json({ policy: rows[0] })
}

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'
const SCHEMA = 'campanhasmarketingdigital'

function slugify(s: string) {
  return (s || 'destino')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40) || 'destino'
}

/** GET /api/admin/campanhas/destinos?clientId=own|<uuid> — lista destinos do tenant */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')

  const where: string[] = ['tenant_id = $1']
  const args: any[] = [payload.tenantId]
  if (clientId === 'own') where.push('client_id IS NULL')
  else if (clientId) { args.push(clientId); where.push(`client_id = $${args.length}`) }

  const [destinosRes, tenantRes] = await Promise.all([
    pool.query(
      `SELECT id, name, slug, type, cta_type, config, is_active, client_id, created_at, updated_at
         FROM ${SCHEMA}."CtaDestination"
        WHERE ${where.join(' AND ')}
        ORDER BY created_at DESC`,
      args,
    ),
    pool.query(
      `SELECT cta_webhook_key FROM public.tenants WHERE id = $1`,
      [payload.tenantId],
    ),
  ])
  return NextResponse.json({
    success: true,
    destinos: destinosRes.rows,
    webhook_key: tenantRes.rows[0]?.cta_webhook_key ?? null,
  })
}

/** POST /api/admin/campanhas/destinos — cria um destino */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const { name, type = 'APP_FORM', cta_type = null, config = {}, client_id = null } = body
  if (!name || String(name).trim() === '') {
    return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  // slug único: base + sufixo curto
  let slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`
  for (let i = 0; i < 3; i++) {
    const { rows } = await pool.query(`SELECT 1 FROM ${SCHEMA}."CtaDestination" WHERE slug = $1`, [slug])
    if (rows.length === 0) break
    slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 7)}`
  }

  const { rows } = await pool.query(
    `INSERT INTO ${SCHEMA}."CtaDestination" (tenant_id, client_id, name, slug, type, cta_type, config)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
     RETURNING id, name, slug, type, cta_type, config, is_active, client_id, created_at`,
    [payload.tenantId, client_id, name, slug, type, cta_type, JSON.stringify(config)],
  )
  return NextResponse.json({ success: true, destino: rows[0] }, { status: 201 })
}

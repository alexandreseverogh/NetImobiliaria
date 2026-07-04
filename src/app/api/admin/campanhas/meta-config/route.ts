import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

/** GET — retorna config Meta atual do tenant */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT meta_verify_token, meta_app_secret, meta_page_map FROM public.tenants WHERE id = $1`,
    [payload.tenantId],
  )
  const row = rows[0] || {}
  return NextResponse.json({
    meta_verify_token: row.meta_verify_token ?? null,
    meta_app_secret_set: !!row.meta_app_secret,
    meta_page_map: row.meta_page_map ?? [],
  })
}

/** POST — salva config Meta do tenant */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json()
  const { meta_app_secret, meta_page_map, generate_token } = body

  // Gerar novo verify_token se solicitado
  let tokenClause = ''
  const args: any[] = [payload.tenantId]

  if (generate_token) {
    const newToken = randomBytes(20).toString('hex')
    tokenClause = ', meta_verify_token = $' + (args.push(newToken))
  }

  if (meta_app_secret !== undefined) {
    tokenClause += ', meta_app_secret = $' + (args.push(meta_app_secret || null))
  }

  if (meta_page_map !== undefined) {
    tokenClause += ', meta_page_map = $' + (args.push(JSON.stringify(meta_page_map))) + '::jsonb'
  }

  if (!tokenClause) return NextResponse.json({ ok: true, message: 'Nada a atualizar' })

  const { rows } = await pool.query(
    `UPDATE public.tenants SET updated_at = NOW()${tokenClause} WHERE id = $1
     RETURNING meta_verify_token, meta_app_secret, meta_page_map`,
    args,
  )

  return NextResponse.json({
    ok: true,
    meta_verify_token: rows[0]?.meta_verify_token,
    meta_app_secret_set: !!rows[0]?.meta_app_secret,
    meta_page_map: rows[0]?.meta_page_map ?? [],
  })
}

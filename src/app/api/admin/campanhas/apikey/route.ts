import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/** GET — retorna a api_key atual do tenant */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT cta_webhook_key FROM public.tenants WHERE id = $1`,
    [payload.tenantId],
  )
  return NextResponse.json({ api_key: rows[0]?.cta_webhook_key ?? null })
}

/** POST — regenera a api_key do tenant */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `UPDATE public.tenants
        SET cta_webhook_key = gen_random_uuid()::text
      WHERE id = $1
     RETURNING cta_webhook_key`,
    [payload.tenantId],
  )
  return NextResponse.json({ api_key: rows[0]?.cta_webhook_key })
}

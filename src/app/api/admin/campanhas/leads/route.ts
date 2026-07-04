import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const sp      = new URL(request.url).searchParams
  const clientId  = sp.get('clientId')
  const startDate = sp.get('startDate')
  const endDate   = sp.get('endDate')
  const origem    = sp.get('origem')
  const page      = Math.max(1, parseInt(sp.get('page') || '1'))
  const limit     = Math.min(100, parseInt(sp.get('limit') || '20'))
  const offset    = (page - 1) * limit

  const conditions: string[] = ['ls.tenant_id = $1']
  const params: unknown[] = [payload.tenantId]

  if (clientId === 'own') {
    conditions.push('ls.client_id IS NULL')
  } else if (clientId && clientId !== 'all' && clientId !== 'segment') {
    params.push(clientId)
    conditions.push(`ls.client_id = $${params.length}::uuid`)
  }
  if (startDate) {
    params.push(new Date(startDate))
    conditions.push(`ls.created_at >= $${params.length}`)
  }
  if (endDate) {
    params.push(new Date(endDate + 'T23:59:59'))
    conditions.push(`ls.created_at <= $${params.length}`)
  }
  if (origem && origem !== 'all') {
    params.push(origem)
    conditions.push(`COALESCE(me.plataforma, 'direto') = $${params.length}`)
  }

  const where = conditions.join(' AND ')

  try {
    const [leadsRes, countRes] = await Promise.all([
      pool.query(`
        SELECT id, nome, email, telefone, created_at, utm_source, utm_medium, utm_campaign, origem
        FROM (
          SELECT DISTINCT ON (ls.lead_uuid)
            ls.lead_uuid      AS id,
            ls.nome,
            ls.email,
            ls.telefone,
            ls.created_at,
            me.utm_source,
            me.utm_medium,
            me.utm_campaign,
            COALESCE(me.plataforma, 'direto') AS origem
          FROM public.leads_staging ls
          LEFT JOIN public.marketing_eventos me ON me.lead_uuid = ls.lead_uuid
          WHERE ${where}
          ORDER BY ls.lead_uuid, me.id DESC NULLS LAST
        ) sub
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `, params),
      pool.query(`
        SELECT COUNT(DISTINCT ls.lead_uuid)::int AS total
        FROM public.leads_staging ls
        LEFT JOIN public.marketing_eventos me ON me.lead_uuid = ls.lead_uuid
        WHERE ${where}
      `, params),
    ])

    return NextResponse.json({
      leads: leadsRes.rows,
      total: countRes.rows[0]?.total ?? 0,
      page,
      limit,
    })
  } catch (err: any) {
    console.error('[leads/route] erro:', err)
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
  }
}

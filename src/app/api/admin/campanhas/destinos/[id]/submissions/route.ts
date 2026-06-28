import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'
const SCHEMA = 'campanhasmarketingdigital'

/**
 * GET /api/admin/campanhas/destinos/{id}/submissions
 * Submissões + métricas agregadas (VIEW/SUBMIT) — base dos dashboards de demanda.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const tenant = payload.tenantId
  const id = params.id

  const [subs, metrics] = await Promise.all([
    pool.query(
      `SELECT id, name, email, phone, payload, lead_uuid, campaign_id, created_at
         FROM ${SCHEMA}."CtaSubmission"
        WHERE destination_id = $1 AND tenant_id = $2
        ORDER BY created_at DESC
        LIMIT 200`,
      [id, tenant],
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE event_type = 'VIEW')           AS views,
         COUNT(*) FILTER (WHERE event_type = 'SUBMIT')         AS submits,
         COUNT(*) FILTER (WHERE event_type = 'WHATSAPP_CLICK') AS whatsapp_clicks
       FROM ${SCHEMA}."CtaInteraction"
      WHERE destination_id = $1 AND tenant_id = $2`,
      [id, tenant],
    ),
  ])

  const m = metrics.rows[0] || {}
  const views = Number(m.views || 0)
  const submits = Number(m.submits || 0)
  return NextResponse.json({
    success: true,
    metrics: {
      views,
      submits,
      whatsappClicks: Number(m.whatsapp_clicks || 0),
      conversionRate: views > 0 ? +((submits / views) * 100).toFixed(1) : 0,
    },
    submissions: subs.rows,
  })
}

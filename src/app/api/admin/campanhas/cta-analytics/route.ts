import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'
const S = 'campanhasmarketingdigital'

/**
 * GET /api/admin/campanhas/cta-analytics
 * Dashboard de demanda & captura de CTA. Agrega CtaInteraction + CtaSubmission,
 * isolado por tenant e (opcionalmente) por client_id/segmento.
 *
 * Query params: from, to (ISO date) · clientId ('own'|<uuid>|'all') ·
 *               destinationId · ctaType · utmSource
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const sp = new URL(request.url).searchParams
  const now = new Date()
  const to = sp.get('to') ? new Date(sp.get('to')!) : now
  const from = sp.get('from') ? new Date(sp.get('from')!) : new Date(to.getTime() - 30 * 864e5)
  const spanMs = to.getTime() - from.getTime()
  const prevTo = new Date(from.getTime())
  const prevFrom = new Date(from.getTime() - spanMs)

  const clientId = sp.get('clientId') || 'all'
  const destinationId = sp.get('destinationId')
  const ctaType = sp.get('ctaType')
  const utmSource = sp.get('utmSource')

  // Builder de filtro (mesmas colunas em CtaInteraction e CtaSubmission)
  function filt(f: Date, t: Date) {
    const where: string[] = ['tenant_id = $1', 'created_at >= $2', 'created_at < $3']
    const args: any[] = [payload!.tenantId, f.toISOString(), t.toISOString()]
    if (clientId === 'own') where.push('client_id IS NULL')
    else if (clientId !== 'all') { args.push(clientId); where.push(`client_id = $${args.length}`) }
    if (destinationId) { args.push(destinationId); where.push(`destination_id = $${args.length}`) }
    if (ctaType) { args.push(ctaType); where.push(`cta_type = $${args.length}`) }
    if (utmSource) { args.push(utmSource); where.push(`utm_source = $${args.length}`) }
    return { w: where.join(' AND '), args }
  }

  const cur = filt(from, to)
  const prev = filt(prevFrom, prevTo)

  const [
    kpiInt, kpiSub, kpiIntPrev, kpiSubPrev,
    viewsDay, subsDay, viewsByDest, subsByDest, destNames, byCta, byOrigem, heat,
  ] = await Promise.all([
    pool.query(`SELECT
        COUNT(*) FILTER (WHERE event_type='VIEW')                                  AS views,
        COUNT(*) FILTER (WHERE event_type='WHATSAPP_CLICK')                        AS whatsapp,
        COUNT(*) FILTER (WHERE event_type IN ('SUBMIT','WHATSAPP_CLICK','REDIRECT')) AS interactions
      FROM ${S}."CtaInteraction" WHERE ${cur.w}`, cur.args),
    pool.query(`SELECT COUNT(*) AS submits, COUNT(*) FILTER (WHERE lead_uuid IS NOT NULL) AS leads
      FROM ${S}."CtaSubmission" WHERE ${cur.w}`, cur.args),
    pool.query(`SELECT COUNT(*) FILTER (WHERE event_type='VIEW') AS views FROM ${S}."CtaInteraction" WHERE ${prev.w}`, prev.args),
    pool.query(`SELECT COUNT(*) AS submits FROM ${S}."CtaSubmission" WHERE ${prev.w}`, prev.args),

    pool.query(`SELECT to_char(date_trunc('day', created_at),'YYYY-MM-DD') AS d, COUNT(*) AS n
      FROM ${S}."CtaInteraction" WHERE ${cur.w} AND event_type='VIEW' GROUP BY 1 ORDER BY 1`, cur.args),
    pool.query(`SELECT to_char(date_trunc('day', created_at),'YYYY-MM-DD') AS d, COUNT(*) AS n
      FROM ${S}."CtaSubmission" WHERE ${cur.w} GROUP BY 1 ORDER BY 1`, cur.args),

    pool.query(`SELECT destination_id, COUNT(*) AS views FROM ${S}."CtaInteraction"
      WHERE ${cur.w} AND event_type='VIEW' GROUP BY destination_id`, cur.args),
    pool.query(`SELECT destination_id, COUNT(*) AS submits,
        COUNT(*) FILTER (WHERE lead_uuid IS NOT NULL) AS leads
      FROM ${S}."CtaSubmission" WHERE ${cur.w}
      GROUP BY destination_id ORDER BY submits DESC LIMIT 10`, cur.args),
    pool.query(`SELECT id, name FROM ${S}."CtaDestination" WHERE tenant_id = $1`, [payload!.tenantId]),

    pool.query(`SELECT COALESCE(cta_type,'(sem)') AS k, COUNT(*) AS submits FROM ${S}."CtaSubmission"
      WHERE ${cur.w} GROUP BY 1 ORDER BY submits DESC`, cur.args),
    pool.query(`SELECT COALESCE(utm_source,'(direto)') AS k, COUNT(*) AS submits FROM ${S}."CtaSubmission"
      WHERE ${cur.w} GROUP BY 1 ORDER BY submits DESC LIMIT 8`, cur.args),
    pool.query(`SELECT EXTRACT(DOW FROM created_at)::int AS dow, EXTRACT(HOUR FROM created_at)::int AS hr, COUNT(*) AS n
      FROM ${S}."CtaSubmission" WHERE ${cur.w} GROUP BY 1,2`, cur.args),
  ])

  const num = (x: any) => Number(x || 0)
  const views = num(kpiInt.rows[0]?.views)
  const whatsapp = num(kpiInt.rows[0]?.whatsapp)
  const submits = num(kpiSub.rows[0]?.submits)
  const leads = num(kpiSub.rows[0]?.leads)
  const prevViews = num(kpiIntPrev.rows[0]?.views)
  const prevSubmits = num(kpiSubPrev.rows[0]?.submits)
  const pct = (a: number, b: number) => (b > 0 ? +(((a - b) / b) * 100).toFixed(1) : null)

  // Tendência (merge views+submits por dia)
  const dayMap: Record<string, { date: string; views: number; submits: number }> = {}
  for (const r of viewsDay.rows) dayMap[r.d] = { date: r.d, views: num(r.n), submits: 0 }
  for (const r of subsDay.rows) (dayMap[r.d] = dayMap[r.d] || { date: r.d, views: 0, submits: 0 }).submits = num(r.n)
  const trend = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date))

  // Ranking de destinos (merge views por destino)
  const viewsDest: Record<string, number> = {}
  for (const r of viewsByDest.rows) viewsDest[r.destination_id] = num(r.views)
  const nameMap: Record<string, string> = {}
  for (const r of destNames.rows) nameMap[r.id] = r.name
  const ranking = subsByDest.rows.map((r: any) => {
    const v = viewsDest[r.destination_id] || 0
    return { name: nameMap[r.destination_id] || '(sem nome)', submits: num(r.submits), leads: num(r.leads), views: v, conv: v > 0 ? +((num(r.submits) / v) * 100).toFixed(1) : 0 }
  })

  const porCta = byCta.rows.map((r: any) => ({ key: r.k, submits: num(r.submits) }))
  const porOrigem = byOrigem.rows.map((r: any) => ({ key: r.k, submits: num(r.submits) }))
  const heatmap = heat.rows.map((r: any) => ({ dow: r.dow, hour: r.hr, n: num(r.n) }))

  // Insights automáticos
  const insights: { type: 'success' | 'info' | 'warning' | 'neutral'; text: string }[] = []
  const avgConv = views > 0 ? (submits / views) * 100 : 0
  const top = [...ranking].sort((a, b) => b.conv - a.conv)[0]
  if (top && avgConv > 0 && top.conv >= avgConv * 1.5)
    insights.push({ type: 'success', text: `Destino “${top.name}” converte ${(top.conv / avgConv).toFixed(1)}× a média (${top.conv}% vs ${avgConv.toFixed(1)}%).` })
  const broken = ranking.find((r) => r.views >= 50 && r.submits === 0)
  if (broken) insights.push({ type: 'warning', text: `Alerta: “${broken.name}” tem ${broken.views} views e 0 submissões — possível formulário com problema.` })
  if (heatmap.length) {
    const peak = [...heatmap].sort((a, b) => b.n - a.n)[0]
    const dows = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
    insights.push({ type: 'neutral', text: `Pico de demanda: ${dows[peak.dow]}, por volta das ${peak.hour}h.` })
  }
  if (whatsapp > 0 && submits > 0)
    insights.push({ type: 'info', text: `${whatsapp} cliques de WhatsApp no período — considere reforçar esse CTA nas campanhas.` })

  return NextResponse.json({
    success: true,
    period: { from: from.toISOString(), to: to.toISOString() },
    kpis: {
      views, submits, whatsapp, leads,
      conversion: views > 0 ? +((submits / views) * 100).toFixed(1) : 0,
      aproveitamento: submits > 0 ? +((leads / submits) * 100).toFixed(1) : 0,
      deltaViews: pct(views, prevViews),
      deltaSubmits: pct(submits, prevSubmits),
    },
    funnel: [
      { stage: 'Visualizações', value: views },
      { stage: 'Interações', value: num(kpiInt.rows[0]?.interactions) },
      { stage: 'Submissões', value: submits },
      { stage: 'Leads no CRM', value: leads },
    ],
    trend, ranking, porCta, porOrigem, heatmap, insights,
  })
}

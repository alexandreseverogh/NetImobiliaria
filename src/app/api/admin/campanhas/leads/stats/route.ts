import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

const ORIGEM_LABEL: Record<string, string> = {
  cta_app_form:        'Formulário',
  cta:                 'Formulário CTA',
  cta_whatsapp:        'WhatsApp CTA',
  cta_api:             'Webhook Externo',
  whatsapp_organico:   'WhatsApp Orgânico',
  meta_lead_ads:       'Meta Lead Ads',
  api_webhook:         'API / Webhook',
  direto:              'Direto',
}

export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const sp      = new URL(request.url).searchParams
  const clientId  = sp.get('clientId')
  const startDate = sp.get('startDate')
  const endDate   = sp.get('endDate')

  const conditions: string[] = ['ls.tenant_id = $1']
  const params: unknown[] = [payload.tenantId]

  if (clientId === 'own') {
    conditions.push('ls.client_id IS NULL')
  } else if (clientId && clientId !== 'all') {
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

  const where = conditions.join(' AND ')
  const joinBase = `
    FROM public.leads_staging ls
    LEFT JOIN public.marketing_eventos me ON me.lead_uuid = ls.lead_uuid
    WHERE ${where}
  `

  // "Sinal de Interesse (Meta)" — mesmo escopo (tenant/cliente/data), mas contando o EVENTO de
  // engajamento (clique de WhatsApp + formulário preenchido) em vez do contato confirmado no
  // CRM. CtaInteraction/CtaSubmission só existem pro Meta (Google não grava nessas tabelas — a
  // conversão dele é só um número agregado da própria API, sem evento individual pra contar
  // aqui) — por isso este número é implicitamente "só Meta", sem precisar filtrar rede.
  const S = 'campanhasmarketingdigital'
  const buildScopeCondition = (alias: string) => {
    const cond: string[] = [`${alias}.tenant_id = $1`]
    const p: unknown[] = [payload.tenantId]
    if (clientId === 'own') {
      cond.push(`${alias}.client_id IS NULL`)
    } else if (clientId && clientId !== 'all') {
      p.push(clientId)
      cond.push(`${alias}.client_id = $${p.length}::uuid`)
    }
    if (startDate) {
      p.push(new Date(startDate))
      cond.push(`${alias}.created_at >= $${p.length}`)
    }
    if (endDate) {
      p.push(new Date(endDate + 'T23:59:59'))
      cond.push(`${alias}.created_at <= $${p.length}`)
    }
    return { where: cond.join(' AND '), params: p }
  }
  const ciScope = buildScopeCondition('ci')
  const csScope = buildScopeCondition('cs')

  const today = new Date().toISOString().split('T')[0]

  try {
    const [totalRes, todayRes, byDayRes, byOrigemRes, ciCountRes, csCountRes] = await Promise.all([
      pool.query(`SELECT COUNT(DISTINCT ls.lead_uuid)::int AS total ${joinBase}`, params),
      pool.query(`SELECT COUNT(DISTINCT ls.lead_uuid)::int AS total ${joinBase} AND DATE(ls.created_at AT TIME ZONE 'America/Sao_Paulo') = '${today}'`, params),
      pool.query(`
        SELECT
          DATE(ls.created_at AT TIME ZONE 'America/Sao_Paulo') AS date,
          COUNT(DISTINCT ls.lead_uuid)::int AS count
        ${joinBase}
        GROUP BY DATE(ls.created_at AT TIME ZONE 'America/Sao_Paulo')
        ORDER BY date DESC
        LIMIT 30
      `, params),
      pool.query(`
        SELECT
          COALESCE(me.plataforma, 'direto') AS origem,
          COUNT(DISTINCT ls.lead_uuid)::int AS count
        ${joinBase}
        GROUP BY COALESCE(me.plataforma, 'direto')
        ORDER BY count DESC
      `, params),
      pool.query(
        `SELECT COUNT(*)::int AS total FROM ${S}."CtaInteraction" ci
          WHERE ${ciScope.where} AND ci.event_type = 'WHATSAPP_CLICK'`,
        ciScope.params,
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total FROM ${S}."CtaSubmission" cs
          WHERE ${csScope.where} AND cs.lead_uuid IS NOT NULL AND cs.cta_type != 'WHATSAPP_MESSAGE'`,
        csScope.params,
      ),
    ])

    const leadsByDay = byDayRes.rows.map((r) => ({
      date:  r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
      count: Number(r.count),
    }))

    const leadsByOrigem = byOrigemRes.rows.map((r) => ({
      origem: r.origem,
      label:  ORIGEM_LABEL[r.origem] ?? r.origem,
      count:  Number(r.count),
    }))

    const totalLeads = totalRes.rows[0]?.total ?? 0
    const days = leadsByDay.length || 1
    const sinalInteresseMeta = (ciCountRes.rows[0]?.total ?? 0) + (csCountRes.rows[0]?.total ?? 0)

    return NextResponse.json({
      totalLeads,
      leadsHoje:    todayRes.rows[0]?.total ?? 0,
      mediaDia:     (totalLeads / days).toFixed(1),
      leadsByDay,
      leadsByOrigem,
      sinalInteresseMeta,
    })
  } catch (err: any) {
    console.error('[leads/stats] erro:', err)
    return NextResponse.json({ error: err.message ?? 'Erro interno' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { createHmac } from 'crypto'
import { logInteraction, insertSubmission, linkSubmissionLead } from '@/lib/cta/service'

export const dynamic = 'force-dynamic'

const SCHEMA = 'campanhasmarketingdigital'

/**
 * GET /api/public/meta-leads/webhook?token={meta_verify_token}
 * Verificação de hub solicitada pelo Meta ao configurar o webhook.
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams
  const mode = sp.get('hub.mode')
  const verifyToken = sp.get('hub.verify_token')
  const challenge = sp.get('hub.challenge')
  const tenantToken = sp.get('token') // identifica o tenant

  if (mode === 'subscribe' && verifyToken && challenge) {
    // Buscar tenant pelo token de verificação
    const tokenToCheck = tenantToken || verifyToken
    const { rows } = await pool.query(
      `SELECT id FROM public.tenants WHERE meta_verify_token = $1 AND status = 'active' LIMIT 1`,
      [tokenToCheck],
    )
    if (rows[0] && (verifyToken === tokenToCheck)) {
      return new NextResponse(challenge, { status: 200, headers: { 'Content-Type': 'text/plain' } })
    }
  }
  return new NextResponse('Forbidden', { status: 403 })
}

/**
 * POST /api/public/meta-leads/webhook?token={meta_verify_token}
 * Recebe leads do Meta Lead Ads. Verifica assinatura HMAC-SHA256.
 *
 * Payload Meta:
 * {
 *   object: "page",
 *   entry: [{
 *     id: "PAGE_ID",
 *     changes: [{
 *       field: "leadgen",
 *       value: {
 *         leadgen_id, page_id, form_id, ad_id,
 *         field_data: [{name, values}]
 *       }
 *     }]
 *   }]
 * }
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const tenantToken = new URL(request.url).searchParams.get('token')

  if (!tenantToken) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  // 1. Buscar tenant pelo verify_token
  const { rows: tenantRows } = await pool.query(
    `SELECT id, meta_app_secret, meta_page_map FROM public.tenants
      WHERE meta_verify_token = $1 AND status = 'active' LIMIT 1`,
    [tenantToken],
  )
  const tenant = tenantRows[0]
  if (!tenant) {
    return NextResponse.json({ ok: false, error: 'token inválido' }, { status: 401 })
  }

  // 2. Verificar assinatura X-Hub-Signature-256 (se app_secret configurado)
  if (tenant.meta_app_secret) {
    const sig = request.headers.get('x-hub-signature-256')
    if (!sig) return NextResponse.json({ ok: false, error: 'sem assinatura' }, { status: 401 })
    const expected = 'sha256=' + createHmac('sha256', tenant.meta_app_secret).update(rawBody).digest('hex')
    if (sig !== expected) return NextResponse.json({ ok: false, error: 'assinatura inválida' }, { status: 401 })
  }

  let body: any
  try { body = JSON.parse(rawBody) } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  if (body.object !== 'page') {
    return NextResponse.json({ ok: true }) // ignora outros tipos
  }

  const pageMap: Array<{ page_id: string; destination_slug: string }> = tenant.meta_page_map || []

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen') continue
      const val = change.value || {}
      const pageId = String(val.page_id || entry.id || '')

      // 3. Resolver destino pelo page_id
      const mapping = pageMap.find((m) => m.page_id === pageId)
      let dest: { id: string; client_id: string | null; cta_type: string | null } | null = null
      if (mapping?.destination_slug) {
        const destRes = await pool.query(
          `SELECT id, client_id, cta_type FROM ${SCHEMA}."CtaDestination"
            WHERE slug = $1 AND tenant_id = $2 AND is_active = true LIMIT 1`,
          [mapping.destination_slug, tenant.id],
        )
        dest = destRes.rows[0] || null
      }

      // 4. Extrair campos do formulário Meta
      const fields: Record<string, string> = {}
      for (const f of val.field_data || []) {
        fields[f.name] = f.values?.[0] ?? ''
      }

      const name  = fields['full_name'] || fields['nome'] || fields['name'] || null
      const email = fields['email'] || null
      const phone = fields['phone_number'] || fields['phone'] || fields['telefone'] || null

      // 5. Logar + submissão + lead CRM
      const interactionId = await logInteraction({
        tenantId: tenant.id,
        clientId: dest?.client_id ?? null,
        destinationId: dest?.id ?? null,
        adId: val.ad_id ? String(val.ad_id) : null,
        ctaType: dest?.cta_type ?? 'META_LEAD_ADS',
        eventType: 'SUBMIT',
        utm: { source: 'meta', medium: 'lead_ads', campaign: val.form_id ? String(val.form_id) : undefined },
      }).catch(() => '')

      const submissionId = await insertSubmission({
        tenantId: tenant.id,
        clientId: dest?.client_id ?? null,
        destinationId: dest?.id ?? null,
        interactionId,
        ctaType: dest?.cta_type ?? 'META_LEAD_ADS',
        payload: { ...fields, leadgen_id: val.leadgen_id, form_id: val.form_id, page_id: pageId },
        name,
        email,
        phone,
        utm: { source: 'meta', medium: 'lead_ads' },
      }).catch(() => '')

      if (submissionId) {
        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
        fetch(`${baseUrl}/api/crm/leads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenant_id: tenant.id,
            client_id: dest?.client_id ?? null,
            nome: name ?? 'Lead Meta',
            email,
            telefone: phone,
            utm_source: 'meta',
            utm_medium: 'lead_ads',
            utm_campaign: val.form_id ? String(val.form_id) : null,
            origem: 'meta_lead_ads',
            payload_extra: fields,
          }),
        })
          .then((r) => r.json())
          .then((d) => {
            const lu = d.leadUuid ?? d.lead_uuid
            if (lu && submissionId) linkSubmissionLead(submissionId, lu).catch(() => {})
          })
          .catch(() => {})
      }
    }
  }

  return NextResponse.json({ ok: true })
}

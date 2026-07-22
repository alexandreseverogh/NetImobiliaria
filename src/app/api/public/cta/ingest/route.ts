import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { logInteraction, insertSubmission, linkSubmissionLead, resolveCtaRef } from '@/lib/cta/service'

export const dynamic = 'force-dynamic'

const SCHEMA = 'campanhasmarketingdigital'

/**
 * POST /api/public/cta/ingest
 * Mecanismo C — Ingestão via API/Webhook externo.
 *
 * Autenticação (qualquer uma das três formas):
 *   - Header:   Authorization: Bearer {cta_webhook_key}
 *   - Query:    ?token={cta_webhook_key}
 *   - Body:     { "api_key": "{cta_webhook_key}", ... }
 *
 * Body JSON:
 * {
 *   destination_slug?: string,  // slug do CtaDestination (opcional — vincula ao client_id)
 *   ref?: string,               // opcional — trackingId de anúncio real desta plataforma (o
 *                               // mesmo "?ref=" que /api/r/{trackingId} anexa ao redirecionar
 *                               // pro destino do anúncio, inclusive quando o destino é um site
 *                               // PRÓPRIO do cliente). Se presente e resolver, atribui o lead
 *                               // à campanha/anúncio real — sem ele, o lead fica sem campanha
 *                               // (correto para integrações genéricas sem anúncio nosso por
 *                               // trás, ex.: lead comprado de terceiro, portal parceiro).
 *   name?: string,
 *   email?: string,
 *   phone?: string,
 *   utm_source?: string,
 *   utm_medium?: string,
 *   utm_campaign?: string,
 *   utm_content?: string,
 *   ...extra                    // campos adicionais gravados no payload JSONB
 * }
 *
 * Resposta: { ok: true, lead_id: string, submission_id: string }
 */
export async function POST(request: NextRequest) {
  let body: Record<string, any>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON inválido' }, { status: 400 })
  }

  // Resolve api_key: header Bearer > query ?token > body api_key
  const authHeader = request.headers.get('authorization') ?? ''
  const api_key =
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null) ||
    new URL(request.url).searchParams.get('token') ||
    body.api_key ||
    null

  if (!api_key) {
    return NextResponse.json({ ok: false, error: 'Autenticação necessária: Bearer token, ?token= ou campo api_key' }, { status: 401 })
  }

  // Remove api_key do body antes de extrair campos
  const { api_key: _k, destination_slug, ref, name, email, phone,
          utm_source, utm_medium, utm_campaign, utm_content,
          ...extra } = body

  // 1. Autenticar tenant via api_key
  const tenantRes = await pool.query(
    `SELECT id, slug FROM public.tenants WHERE cta_webhook_key = $1 AND status = 'active' LIMIT 1`,
    [api_key],
  )
  if (!tenantRes.rows[0]) {
    return NextResponse.json({ ok: false, error: 'api_key inválida' }, { status: 401 })
  }
  const tenant = tenantRes.rows[0]

  // 2. Resolver destino (opcional)
  let dest: { id: string; client_id: string | null; cta_type: string | null } | null = null
  if (destination_slug) {
    const destRes = await pool.query(
      `SELECT id, client_id, cta_type FROM ${SCHEMA}."CtaDestination"
        WHERE slug = $1 AND tenant_id = $2 AND is_active = true LIMIT 1`,
      [destination_slug, tenant.id],
    )
    dest = destRes.rows[0] || null
  }

  // 2b. Resolver campanha real via "ref" (opcional — mesmo trackingId que /api/r/{trackingId}
  // anexa como "?ref=" ao redirecionar pro destino do anúncio, mesmo quando esse destino é um
  // site PRÓPRIO do cliente que depois empurra o lead pra cá via este webhook). Só confiamos em
  // ref que resolve de verdade — nunca aceitamos campaign_id/ad_id crus vindos do chamador
  // externo, pra não permitir que um integrador arbitrário atribua lead a qualquer campanha.
  const resolvedRef = ref ? await resolveCtaRef(String(ref), tenant.id).catch(() => null) : null
  const resolvedClientId = resolvedRef?.clientId ?? dest?.client_id ?? null
  const resolvedCtaType = resolvedRef?.ctaType ?? dest?.cta_type ?? null
  const resolvedCampaignId = resolvedRef?.campaignId ?? null
  const resolvedAdId = resolvedRef?.adId ?? null

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = request.headers.get('user-agent')

  // 3. Logar interação VIEW + SUBMIT
  const viewId = await logInteraction({
    tenantId: tenant.id,
    clientId: resolvedClientId,
    destinationId: dest?.id ?? null,
    campaignId: resolvedCampaignId,
    adId: resolvedAdId,
    ctaType: resolvedCtaType,
    eventType: 'SUBMIT',
    utm: { source: utm_source, medium: utm_medium, campaign: utm_campaign, content: utm_content },
    ip,
    userAgent,
    referrer: request.headers.get('referer'),
  })

  // 4. Gravar submissão
  const payload = { name, email, phone, ...extra }
  const submissionId = await insertSubmission({
    tenantId: tenant.id,
    clientId: resolvedClientId,
    destinationId: dest?.id ?? null,
    interactionId: viewId,
    campaignId: resolvedCampaignId,
    ctaType: resolvedCtaType,
    payload,
    name: name ?? null,
    email: email ?? null,
    phone: phone ?? null,
    utm: { source: utm_source, medium: utm_medium, campaign: utm_campaign, content: utm_content },
  })

  // 5. Gerar lead no CRM (reutiliza a mesma rota interna)
  let leadUuid: string | null = null
  try {
    const baseUrl = process.env.INTERNAL_BASE_URL || 'http://localhost:3000'
    const crmRes = await fetch(`${baseUrl}/api/crm/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenant.id,
        client_id: resolvedClientId,
        campaign_id: resolvedCampaignId,
        nome: name ?? 'Lead via API',
        email: email ?? null,
        telefone: phone ?? null,
        utm_source: utm_source ?? 'api',
        utm_medium: utm_medium ?? 'webhook',
        utm_campaign: utm_campaign ?? null,
        // /api/crm/leads usa utm_params (aninhado) quando presente e ignora o campo flat
        // utm_campaign — nome real da campanha (via ref) tem prioridade sobre o texto livre.
        utm_params: {
          source:   utm_source   ?? 'api',
          medium:   utm_medium   ?? 'webhook',
          campaign: resolvedRef?.campaignName || utm_campaign || null,
          content:  utm_content  ?? null,
          platform: 'cta_api',
        },
        payload_extra: extra,
      }),
    })
    if (crmRes.ok) {
      const crmData = await crmRes.json()
      leadUuid = crmData.leadUuid ?? crmData.lead_uuid ?? null
      if (leadUuid) await linkSubmissionLead(submissionId, leadUuid)
    }
  } catch {
    // CRM é best-effort — a submissão já foi gravada
  }

  return NextResponse.json({ ok: true, lead_id: leadUuid, submission_id: submissionId })
}

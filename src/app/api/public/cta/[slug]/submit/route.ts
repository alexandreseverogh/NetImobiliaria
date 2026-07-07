import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import {
  getDestinationBySlug,
  logInteraction,
  insertSubmission,
  linkSubmissionLead,
  normalizeContact,
} from '@/lib/cta/service'
import { ingestMessage } from '@/lib/mensageria/ingest'
import { resolveWebformInbox } from '@/lib/mensageria/inboxes'

export const dynamic = 'force-dynamic'

/**
 * POST /api/public/cta/{slug}/submit
 * Recebe o payload de um formulário hospedado pelo app (Mecanismo A), grava:
 *   1) CtaInteraction (event SUBMIT)  → base analítica
 *   2) CtaSubmission (payload completo)
 *   3) Lead no CRM (reusa /api/crm/leads: match engine + kanban + distribuição)
 * e vincula a submissão ao lead criado.
 */
export async function POST(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const slug = params.slug
    const dest = await getDestinationBySlug(slug)
    if (!dest) {
      return NextResponse.json({ error: 'Destino não encontrado ou inativo' }, { status: 404 })
    }
    if (dest.type !== 'APP_FORM') {
      return NextResponse.json({ error: 'Este destino não aceita submissão de formulário' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const payload: Record<string, any> = body?.payload ?? body ?? {}

    const { searchParams } = new URL(request.url)
    const utm = {
      source: payload._utm_source || searchParams.get('utm_source') || 'cta',
      medium: payload._utm_medium || searchParams.get('utm_medium') || 'app_form',
      campaign: payload._utm_campaign || searchParams.get('utm_campaign') || undefined,
      content: payload._utm_content || searchParams.get('utm_content') || undefined,
    }
    const campaignId = payload._campaign_id || searchParams.get('campaign_id') || null
    const adId = payload._ad_id || searchParams.get('ad_id') || null

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null
    const userAgent = request.headers.get('user-agent')
    const referrer = request.headers.get('referer')

    // Remove chaves internas (_utm_*, _campaign_id...) do payload "limpo" do usuário
    const cleanPayload: Record<string, any> = {}
    for (const [k, v] of Object.entries(payload)) if (!k.startsWith('_')) cleanPayload[k] = v

    const fields = dest.config?.fields ?? []
    const { name, email, phone } = normalizeContact(cleanPayload, fields)

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Informe ao menos e-mail ou telefone.' },
        { status: 422 },
      )
    }

    // 1) Interação SUBMIT
    const interactionId = await logInteraction({
      tenantId: dest.tenant_id,
      clientId: dest.client_id,
      destinationId: dest.id,
      campaignId,
      adId,
      ctaType: dest.cta_type,
      eventType: 'SUBMIT',
      utm,
      ip,
      userAgent,
      referrer,
    })

    // 2) Submissão (payload completo)
    const submissionId = await insertSubmission({
      tenantId: dest.tenant_id,
      clientId: dest.client_id,
      destinationId: dest.id,
      interactionId,
      campaignId,
      ctaType: dest.cta_type,
      payload: cleanPayload,
      name,
      email,
      phone,
      utm,
    })

    // 2.a Ingestão no Mensageria (thread unificada) — roda em paralelo ao fluxo de
    // lead abaixo; falha aqui NUNCA deve derrubar a captação de lead existente.
    const mensageriaResult = await (async () => {
      try {
        const inboxId = await resolveWebformInbox(dest.tenant_id)
        const summary = Object.entries(cleanPayload)
          .filter(([, v]) => v != null && String(v).trim() !== '')
          .map(([k, v]) => `${k}: ${v}`)
          .join('\n')
        return await ingestMessage({
          tenantId: dest.tenant_id,
          clientId: dest.client_id,
          inboxId,
          contact: { name, phone, email },
          direction: 'inbound',
          senderType: 'contact',
          content: summary || 'Formulário enviado (sem campos preenchidos)',
          externalId: submissionId,
        })
      } catch (err) {
        console.error('[cta-submit] falha na ingestão Mensageria (não bloqueante):', err)
        return null
      }
    })()

    // 3) Lead no CRM (reusa o pipeline completo via /api/crm/leads)
    let leadUuid: string | null = null
    try {
      const origin = new URL(request.url).origin
      const crmRes = await fetch(`${origin}/api/crm/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: name,
          email,
          telefone: phone,
          tenant_id: dest.tenant_id,
          client_id: dest.client_id,
          raw_json: { ...cleanPayload, _cta_destination: dest.slug, _cta_submission_id: submissionId },
          mensagem: cleanPayload.mensagem || cleanPayload.message || '',
          utm_source: utm.source,
          utm_campaign: utm.campaign,
          utm_params: {
            source: utm.source,
            medium: utm.medium,
            campaign: utm.campaign,
            content: utm.content,
            platform: 'cta_app_form',
          },
        }),
      })
      if (crmRes.ok) {
        const crmData = await crmRes.json().catch(() => ({}))
        leadUuid = crmData.leadUuid || crmData.lead_uuid || crmData.id || crmData?.data?.lead_uuid || null
        if (leadUuid) {
          await linkSubmissionLead(submissionId, leadUuid)
          if (mensageriaResult?.contactId) {
            await pool.query(
              `UPDATE mensageria.contacts SET lead_uuid = $1 WHERE id = $2 AND lead_uuid IS NULL`,
              [leadUuid, mensageriaResult.contactId],
            ).catch(() => {})
          }
        }
      } else {
        console.error('[CTA submit] /api/crm/leads falhou:', crmRes.status)
      }
    } catch (e) {
      // Não bloqueia a submissão se a geração de lead falhar — o dado já está salvo.
      console.error('[CTA submit] erro ao gerar lead no CRM:', e)
    }

    return NextResponse.json({
      success: true,
      submissionId,
      leadUuid,
      thankYouMessage: dest.config?.thankYouMessage || 'Recebemos seus dados. Em breve entraremos em contato!',
      redirectUrl: dest.config?.redirectUrl || null,
    })
  } catch (error) {
    console.error('[CTA submit] erro:', error)
    return NextResponse.json({ error: 'Erro ao processar submissão' }, { status: 500 })
  }
}

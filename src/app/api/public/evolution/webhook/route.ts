import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { logInteraction, insertSubmission, linkSubmissionLead } from '@/lib/cta/service'
import { ingestMessage } from '@/lib/mensageria/ingest'
import { resolveWhatsAppInbox } from '@/lib/mensageria/inboxes'

export const dynamic = 'force-dynamic'

const SCHEMA = 'campanhasmarketingdigital'

/**
 * POST https://artemis4.com.br/api/public/evolution/webhook?token={evolution_webhook_secret}
 *
 * Recebe eventos MESSAGES_UPSERT da Evolution API (WhatsApp Business).
 * Quando uma mensagem chega de um CTA WhatsApp (contém [ref:slug]),
 * cria automaticamente CtaSubmission + lead no CRM.
 *
 * Para mensagens sem [ref:], cria o lead de origem genérica 'whatsapp_organico'.
 *
 * Autenticação: query param ?token= mapeia para tenants.evolution_webhook_secret
 *               + verifica se payload.instance bate com tenants.evolution_instance
 */
export async function POST(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return NextResponse.json({ ok: false, error: 'token ausente' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  // 1. Verificar se é um evento de mensagem chegando
  const event: string = body?.event || ''
  if (!event.includes('messages') && event !== 'MESSAGES_UPSERT') {
    // Ignorar outros eventos (connection.update, qr.updated, etc.) silenciosamente
    return NextResponse.json({ ok: true, ignored: true })
  }

  // 2. Identificar tenant pelo token + instância
  const instance: string = body?.instance || ''
  const { rows: tenantRows } = await pool.query(
    `SELECT id, slug, evolution_instance FROM public.tenants
      WHERE evolution_webhook_secret = $1 AND status = 'active' LIMIT 1`,
    [token],
  )
  const tenant = tenantRows[0]
  if (!tenant) return NextResponse.json({ ok: false, error: 'token inválido' }, { status: 401 })

  // Verificação secundária: instância bate com a configurada no tenant
  if (tenant.evolution_instance && instance && tenant.evolution_instance !== instance) {
    return NextResponse.json({ ok: false, error: 'instância não corresponde' }, { status: 403 })
  }

  // 3. Extrair dados da mensagem
  // Evolution v2 pode mandar array em data ou objeto único
  const entries: any[] = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : []
  if (entries.length === 0) return NextResponse.json({ ok: true, ignored: true })

  for (const entry of entries) {
    // Ignorar mensagens enviadas pelo próprio sistema
    if (entry?.key?.fromMe === true) continue

    const remoteJid: string = entry?.key?.remoteJid || ''
    if (!remoteJid || remoteJid.includes('@g.us')) continue // ignorar grupos

    // Extrair número limpo: "5511999998888@s.whatsapp.net" → "5511999998888"
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '')
    const pushName: string = entry?.pushName || null

    // Extrair texto da mensagem (suporta conversation, extendedText, imageCaption)
    const msgText: string =
      entry?.message?.conversation ||
      entry?.message?.extendedTextMessage?.text ||
      entry?.message?.imageMessage?.caption ||
      entry?.message?.videoMessage?.caption ||
      entry?.message?.documentMessage?.caption ||
      ''

    if (!msgText && !phone) continue

    // 4. Detectar [ref:slug] para rastrear origem de CTA
    const refMatch = msgText.match(/\[ref:([^\]]+)\]/)
    const ctaSlug = refMatch?.[1] || null

    let dest: { id: string; client_id: string | null; cta_type: string | null } | null = null
    if (ctaSlug) {
      const destRes = await pool.query(
        `SELECT id, client_id, cta_type FROM ${SCHEMA}."CtaDestination"
          WHERE slug = $1 AND tenant_id = $2 AND is_active = true LIMIT 1`,
        [ctaSlug, tenant.id],
      )
      dest = destRes.rows[0] || null
    }

    // 5.a Ingestão no Mensageria (thread unificada) — roda em paralelo ao fluxo de
    // CTA/lead abaixo; falha aqui NUNCA deve derrubar a captação de lead existente.
    const mensageriaResult = await (async () => {
      try {
        const inboxId = await resolveWhatsAppInbox(tenant.id)
        return await ingestMessage({
          tenantId: tenant.id,
          clientId: dest?.client_id ?? null,
          inboxId,
          contact: { name: pushName, phone },
          direction: 'inbound',
          senderType: 'contact',
          content: msgText || null,
          externalId: entry?.key?.id ?? null,
        })
      } catch (err) {
        console.error('[evolution-webhook] falha na ingestão Mensageria (não bloqueante):', err)
        return null
      }
    })()

    // 5. Logar interação (SUBMIT pois veio uma mensagem real)
    const interactionId = await logInteraction({
      tenantId: tenant.id,
      clientId: dest?.client_id ?? null,
      destinationId: dest?.id ?? null,
      ctaType: dest?.cta_type ?? 'WHATSAPP',
      eventType: 'SUBMIT',
      utm: { source: 'whatsapp', medium: ctaSlug ? 'cta' : 'organico' },
    }).catch(() => '')

    // 6. Gravar submissão com os dados da conversa
    const submissionId = await insertSubmission({
      tenantId: tenant.id,
      clientId: dest?.client_id ?? null,
      destinationId: dest?.id ?? null,
      interactionId,
      ctaType: dest?.cta_type ?? 'WHATSAPP',
      payload: { phone, pushName, message: msgText, remoteJid },
      name: pushName,
      phone,
      utm: { source: 'whatsapp', medium: ctaSlug ? 'cta' : 'organico' },
    }).catch(() => '')

    // 7. Criar lead no CRM
    try {
      const baseUrl = process.env.INTERNAL_BASE_URL || 'http://localhost:3000'
      const crmRes = await fetch(`${baseUrl}/api/crm/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          client_id: dest?.client_id ?? null,
          nome: pushName || `WhatsApp ${phone}`,
          telefone: phone,
          email: null,
          utm_source: 'whatsapp',
          utm_medium: ctaSlug ? 'cta' : 'organico',
          utm_campaign: ctaSlug ?? null,
          origem: ctaSlug ? 'cta_whatsapp' : 'whatsapp_organico',
          mensagem_inicial: msgText || null,
          payload_extra: { remoteJid, pushName, cta_slug: ctaSlug },
        }),
      })
      if (crmRes.ok) {
        const crmData = await crmRes.json()
        const leadUuid = crmData.leadUuid ?? crmData.lead_uuid ?? null
        if (leadUuid && submissionId) {
          await linkSubmissionLead(submissionId, leadUuid).catch(() => {})
        }
        // Liga o lead ao contato do Mensageria — ponte de desacoplamento (soft link, sem FK físico)
        if (leadUuid && mensageriaResult?.contactId) {
          await pool.query(
            `UPDATE mensageria.contacts SET lead_uuid = $1 WHERE id = $2 AND lead_uuid IS NULL`,
            [leadUuid, mensageriaResult.contactId],
          ).catch(() => {})
        }
      }
    } catch {
      // best-effort — submissão já foi salva
    }
  }

  // Evolution espera resposta rápida (< 5s)
  return NextResponse.json({ ok: true })
}

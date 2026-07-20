/**
 * Processador de mensagens de WhatsApp entrantes — agnóstico de provider.
 *
 * Extraído de src/app/api/public/evolution/webhook/route.ts pra desacoplar a LÓGICA DE NEGÓCIO
 * (atribuição de CTA/campanha + criação de lead no CRM + ligação com a Mensageria) do provider
 * específico (Evolution API). Um adaptador de provider (Evolution hoje; Meta WhatsApp Cloud API
 * oficial, ou qualquer outro, no futuro) só precisa: autenticar a requisição, normalizar o
 * payload bruto pra NormalizedWhatsAppInbound, e chamar processInboundWhatsAppMessage — zero
 * duplicação da lógica abaixo entre providers.
 *
 * Ver docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §9.3.
 */
import pool from '@/lib/database/connection'
import { ingestMessage } from '@/lib/mensageria/ingest'
import { resolveWhatsAppInbox } from '@/lib/mensageria/inboxes'
import { logInteraction, insertSubmission, linkSubmissionLead, resolveCtaRef } from '@/lib/cta/service'

export interface NormalizedWhatsAppInbound {
  tenantId: string
  /** Dono do número físico que recebeu a mensagem (cliente com WhatsApp próprio) — resolvido na
   *  autenticação do provider. Mais confiável que o [ref:] pra decidir ONDE a conversa cai na
   *  Mensageria (a mensagem chegou fisicamente naquele número); [ref:] segue sendo a fonte de
   *  verdade só pra atribuição de campanha/CTA (propositalmente não misturado). */
  ownerClientId: string | null
  phone: string
  pushName: string | null
  text: string | null
  /** ID da mensagem no provider de origem — usado pra dedupe/idempotência na Mensageria */
  externalMessageId: string | null
}

export interface InboundProcessResult {
  leadUuid: string | null
  mensageriaContactId: string | null
  mensageriaConversationId: string | null
}

/**
 * Processa uma mensagem de WhatsApp já normalizada: ingere na Mensageria (thread unificada,
 * best-effort — nunca bloqueia o resto) e, se a mensagem contiver "[ref:xxx]", resolve a origem
 * (campanha real desta plataforma OU mecanismo de CTA externo — ver resolveCtaRef) e cria/atualiza
 * o lead canônico no CRM com a atribuição correta.
 */
export async function processInboundWhatsAppMessage(
  input: NormalizedWhatsAppInbound,
): Promise<InboundProcessResult> {
  const { tenantId, ownerClientId, phone, pushName, text, externalMessageId } = input

  const refMatch = text?.match(/\[ref:([^\]]+)\]/)
  const ref = refMatch?.[1] || null

  const resolved = ref ? await resolveCtaRef(ref, tenantId).catch(() => null) : null

  // Cliente dono do número físico tem prioridade sobre o client_id resolvido do ref pra decidir
  // onde a conversa cai na Mensageria (ver doc no campo ownerClientId acima).
  const mensageriaClientId = ownerClientId ?? resolved?.clientId ?? null

  // 1. Ingestão na Mensageria — thread unificada. Falha aqui NUNCA deve derrubar a captação de
  // lead abaixo (best-effort, isolado em try/catch próprio).
  let mensageriaResult: { contactId: string; conversationId: string } | null = null
  try {
    const inboxId = await resolveWhatsAppInbox(tenantId, mensageriaClientId)
    const r = await ingestMessage({
      tenantId,
      clientId: mensageriaClientId,
      inboxId,
      contact: { name: pushName, phone },
      direction: 'inbound',
      senderType: 'contact',
      content: text || null,
      externalId: externalMessageId,
    })
    mensageriaResult = { contactId: r.contactId, conversationId: r.conversationId }
  } catch (err) {
    console.error('[inboundProcessor] falha na ingestão Mensageria (não bloqueante):', err)
  }

  // 2. Logar interação (SUBMIT — chegou uma mensagem real)
  const interactionId = await logInteraction({
    tenantId,
    clientId: resolved?.clientId ?? null,
    destinationId: resolved?.destinationId ?? null,
    campaignId: resolved?.campaignId ?? null,
    adId: resolved?.adId ?? null,
    ctaType: resolved?.ctaType ?? 'WHATSAPP',
    eventType: 'SUBMIT',
    utm: { source: 'whatsapp', medium: ref ? 'cta' : 'organico' },
  }).catch(() => '')

  // 3. Gravar a submissão com os dados da conversa
  const submissionId = await insertSubmission({
    tenantId,
    clientId: resolved?.clientId ?? null,
    destinationId: resolved?.destinationId ?? null,
    interactionId: interactionId || null,
    campaignId: resolved?.campaignId ?? null,
    ctaType: resolved?.ctaType ?? 'WHATSAPP',
    payload: { phone, pushName, message: text },
    name: pushName,
    phone,
    utm: { source: 'whatsapp', medium: ref ? 'cta' : 'organico' },
  }).catch(() => '')

  // 4. Criar/atualizar lead no CRM (fonte canônica — leads_staging + marketing_eventos)
  let leadUuid: string | null = null
  try {
    const baseUrl = process.env.INTERNAL_BASE_URL || 'http://localhost:3000'
    // origem distingue as 3 procedências possíveis: campanha real desta plataforma, mecanismo
    // de CTA externo, ou WhatsApp orgânico sem nenhum ref reconhecido.
    const origem = resolved?.campaignId
      ? 'campanha_plataforma'
      : resolved?.destinationId
      ? 'cta_whatsapp'
      : 'whatsapp_organico'

    const crmRes = await fetch(`${baseUrl}/api/crm/leads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenant_id: tenantId,
        client_id: resolved?.clientId ?? null,
        nome: pushName || `WhatsApp ${phone}`,
        telefone: phone,
        email: null,
        utm_source: 'whatsapp',
        utm_medium: ref ? 'cta' : 'organico',
        utm_campaign: resolved?.campaignName ?? ref ?? null,
        campaign_id: resolved?.campaignId ?? null,
        origem,
        mensagem_inicial: text || null,
        payload_extra: { pushName, ref, ad_id: resolved?.adId ?? null },
      }),
    })
    if (crmRes.ok) {
      const crmData = await crmRes.json()
      leadUuid = crmData.leadUuid ?? crmData.lead_uuid ?? null
      if (leadUuid && submissionId) {
        await linkSubmissionLead(submissionId, leadUuid).catch(() => {})
      }
      // Liga o lead ao contato da Mensageria — ponte de desacoplamento (soft link, sem FK
      // física entre os schemas campanhasmarketingdigital/mensageria e public).
      if (leadUuid && mensageriaResult?.contactId) {
        await pool.query(
          `UPDATE mensageria.contacts SET lead_uuid = $1 WHERE id = $2 AND lead_uuid IS NULL`,
          [leadUuid, mensageriaResult.contactId],
        ).catch(() => {})
      }
    }
  } catch (err) {
    console.error('[inboundProcessor] falha ao criar lead no CRM (submissão já salva):', err)
  }

  return {
    leadUuid,
    mensageriaContactId: mensageriaResult?.contactId ?? null,
    mensageriaConversationId: mensageriaResult?.conversationId ?? null,
  }
}

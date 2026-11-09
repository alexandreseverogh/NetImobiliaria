/**
 * Envio outbound via WhatsApp Cloud API oficial da Meta — provider irmão de evolutionSend.ts,
 * mesma assinatura de função (dispatch.ts escolhe qual dos dois chamar pelo `inbox.provider`).
 *
 * Só mensagem de serviço (texto livre, dentro da janela de 24h) — Template (fora da janela)
 * é escopo da fase W4, deliberadamente não implementado ainda (ver docs/
 * PLANO_WHATSAPP_CLOUD_API_PROVIDER.md seção 7).
 *
 * Contrato real da API (pesquisado, não por memória):
 *   POST https://graph.facebook.com/v21.0/{phone_number_id}/messages
 *   Authorization: Bearer <access_token>
 *   { messaging_product: "whatsapp", to, type: "text", text: { body, preview_url: false } }
 * Resposta: { messages: [{ id }] } — id externo pra dedupe (external_id em mensageria.messages).
 */
import axios from 'axios'
import pool from '@/lib/database/connection'

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0'

export interface WhatsAppCloudInboxConfig {
  phone_number_id?: string | null
  access_token?: string | null
}

/** Janela de atendimento da Meta: texto livre só é aceito até 24h após a última msg do cliente. */
export const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000

/** Pura: a janela de 24h está aberta em `now` dado o instante da última msg recebida? */
export function isWithinServiceWindow(lastInboundAt: Date | null, now: Date = new Date()): boolean {
  if (!lastInboundAt) return false
  return now.getTime() - lastInboundAt.getTime() < SERVICE_WINDOW_MS
}

async function getLastInboundAt(conversationId: string): Promise<Date | null> {
  const { rows } = await pool.query(
    `SELECT max(created_at) AS last_in FROM mensageria.messages
      WHERE conversation_id = $1 AND direction = 'inbound'`,
    [conversationId],
  )
  return rows[0]?.last_in ? new Date(rows[0].last_in) : null
}

/**
 * Mensagem de erro se o envio de texto livre estiver fora da janela (ou se a conversa não for
 * identificada). null = pode enviar. Quando recusa, a Meta nunca é chamada.
 */
async function windowError(conversationId?: string | null): Promise<string | null> {
  if (!conversationId) {
    return 'Envio fora da janela de 24h exige template aprovado: conversa não identificada.'
  }
  const lastIn = await getLastInboundAt(conversationId)
  if (!isWithinServiceWindow(lastIn)) {
    return 'Janela de 24h encerrada: o cliente não respondeu nas últimas 24 horas. Só é possível enviar templates aprovados (ainda não suportado).'
  }
  return null
}

/**
 * Contador do mês (seção 2.3/2.4 do plano) — só visibilidade/aviso, nunca é o que decide se a
 * Meta entrega ou não a mensagem (isso é 100% do lado da Meta). Best-effort: uma falha aqui
 * nunca derruba o envio real, que já aconteceu com sucesso quando esta função é chamada.
 */
async function incrementMonthlyUsage(phoneNumberId: string): Promise<void> {
  const yearMonth = new Date().toISOString().slice(0, 7)
  try {
    await pool.query(
      `INSERT INTO mensageria.whatsapp_cloud_usage_monthly (phone_number_id, year_month, service_messages_sent)
       VALUES ($1, $2, 1)
       ON CONFLICT (phone_number_id, year_month)
       DO UPDATE SET service_messages_sent = mensageria.whatsapp_cloud_usage_monthly.service_messages_sent + 1`,
      [phoneNumberId, yearMonth],
    )
  } catch (err) {
    console.error('[whatsappCloudSend] falha ao incrementar contador de uso mensal:', err)
  }
}

/**
 * Cloud API espera o número em formato E.164 sem '+' (ex.: 5581999999999) — mesma convenção
 * de dígitos puros já usada no restante da Mensageria, sem o ajuste de 9º dígito que a
 * Evolution exige (Cloud API aceita o número completo real, com os 9 dígitos do celular).
 */
function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '')
}

async function postMessage(
  config: WhatsAppCloudInboxConfig,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; externalId?: string; error?: string }> {
  if (!config.phone_number_id || !config.access_token) {
    return { ok: false, error: 'Inbox sem credenciais WhatsApp Cloud API configuradas' }
  }

  try {
    const res = await axios.post(
      `${GRAPH_API_BASE}/${config.phone_number_id}/messages`,
      body,
      { headers: { Authorization: `Bearer ${config.access_token}`, 'Content-Type': 'application/json' } },
    )
    const externalId = res.data?.messages?.[0]?.id ?? undefined
    if (config.phone_number_id) await incrementMonthlyUsage(config.phone_number_id)
    return { ok: true, externalId }
  } catch (err: any) {
    // Corpo real de erro da Graph API: { error: { message, code, error_subcode, ... } } —
    // é aqui que apareceria, por exemplo, a rejeição por franquia gratuita esgotada sem
    // cartão cadastrado (ver plano seção 2.3) — superficie o texto da Meta, nunca mascarar.
    return { ok: false, error: err.response?.data?.error?.message || err.message }
  }
}

export async function sendWhatsAppCloudMessage(
  config: WhatsAppCloudInboxConfig,
  toPhone: string,
  text: string,
  conversationId?: string | null,
): Promise<{ ok: boolean; externalId?: string; error?: string }> {
  const blocked = await windowError(conversationId)
  if (blocked) return { ok: false, error: blocked }
  return postMessage(config, {
    messaging_product: 'whatsapp',
    to: normalizePhone(toPhone),
    type: 'text',
    text: { body: text, preview_url: false },
  })
}

export async function sendWhatsAppCloudMedia(
  config: WhatsAppCloudInboxConfig,
  toPhone: string,
  mediaUrl: string,
  caption?: string,
  conversationId?: string | null,
): Promise<{ ok: boolean; externalId?: string; error?: string }> {
  const blocked = await windowError(conversationId)
  if (blocked) return { ok: false, error: blocked }
  return postMessage(config, {
    messaging_product: 'whatsapp',
    to: normalizePhone(toPhone),
    type: 'image',
    image: { link: mediaUrl, caption: caption || undefined },
  })
}

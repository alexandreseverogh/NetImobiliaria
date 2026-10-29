/**
 * Dispatcher de envio de WhatsApp — escolhe entre os providers (Evolution / Cloud API oficial)
 * pelo `mensageria.inboxes.provider` da inbox, sem o chamador precisar saber qual é.
 *
 * Ver docs/PLANO_WHATSAPP_CLOUD_API_PROVIDER.md seção 5.3 — substitui a importação direta de
 * sendEvolutionMessage/sendEvolutionMedia nos 3 call sites reais (botAdapter.ts,
 * conversations/[id]/messages/route.ts, reactivationExecutor.ts).
 */
import { sendEvolutionMessage, sendEvolutionMedia } from './evolutionSend'
import { sendWhatsAppCloudMessage, sendWhatsAppCloudMedia } from './whatsappCloudSend'

export type WhatsAppSendConfig = Record<string, unknown>
export type WhatsAppSendResult = { ok: boolean; externalId?: string; error?: string }

/**
 * `provider` vem direto de `mensageria.inboxes.provider` — hoje só 2 valores reais pra canal
 * whatsapp ('evolution' | 'whatsapp_cloud'); qualquer outro valor (ou ausente, legado) cai no
 * comportamento de sempre (Evolution), nunca quebra silenciosamente por provider desconhecido.
 */
export async function sendWhatsAppMessage(
  provider: string | null | undefined,
  config: WhatsAppSendConfig,
  toPhone: string,
  text: string,
): Promise<WhatsAppSendResult> {
  if (provider === 'whatsapp_cloud') return sendWhatsAppCloudMessage(config, toPhone, text)
  return sendEvolutionMessage(config as any, toPhone, text)
}

export async function sendWhatsAppMedia(
  provider: string | null | undefined,
  config: WhatsAppSendConfig,
  toPhone: string,
  mediaUrl: string,
  caption?: string,
): Promise<WhatsAppSendResult> {
  if (provider === 'whatsapp_cloud') return sendWhatsAppCloudMedia(config, toPhone, mediaUrl, caption)
  return sendEvolutionMedia(config as any, toPhone, mediaUrl, caption)
}

/**
 * Envio outbound via Evolution API, a partir da config armazenada na inbox
 * (mensageria.inboxes.config). Mesma lógica de src/lib/marketing/services/agentNotificador.ts,
 * extraída para ser reutilizável por qualquer conversa/inbox (não só notificações de sistema).
 *
 * Ver docs/PLANO_MENSAGERIA.md seção 14.1 — este é o "provider evolution" da abstração de canal.
 */
import axios from 'axios'

export interface EvolutionInboxConfig {
  api_url?: string | null
  api_key?: string | null
  instance?: string | null
  number?: string | null
}

function normalizePhone(raw: string): string {
  let phone = raw.replace(/\D/g, '')
  // BR mobile: 55 + 2-digit DDD + 9-digit = 13 digits; Evolution espera 12 (remove o 9º dígito)
  if (phone.length === 13 && phone.startsWith('55')) {
    phone = phone.slice(0, 4) + phone.slice(5)
  }
  return phone
}

export async function sendEvolutionMessage(
  config: EvolutionInboxConfig,
  toPhone: string,
  text: string,
): Promise<{ ok: boolean; externalId?: string; error?: string }> {
  if (!config.api_url || !config.api_key || !config.instance) {
    return { ok: false, error: 'Inbox sem credenciais Evolution configuradas' }
  }

  try {
    const res = await axios.post(
      `${config.api_url}/message/sendText/${config.instance}`,
      { number: normalizePhone(toPhone), text, linkPreview: false },
      { headers: { 'Content-Type': 'application/json', apikey: config.api_key } },
    )
    const externalId = res.data?.key?.id ?? res.data?.id ?? undefined
    return { ok: true, externalId }
  } catch (err: any) {
    return { ok: false, error: err.response?.data?.message || err.message }
  }
}

export async function sendEvolutionMedia(
  config: EvolutionInboxConfig,
  toPhone: string,
  mediaUrl: string,
  caption?: string,
): Promise<{ ok: boolean; externalId?: string; error?: string }> {
  if (!config.api_url || !config.api_key || !config.instance) {
    return { ok: false, error: 'Inbox sem credenciais Evolution configuradas' }
  }

  try {
    const res = await axios.post(
      `${config.api_url}/message/sendMedia/${config.instance}`,
      { number: normalizePhone(toPhone), mediatype: 'image', media: mediaUrl, caption: caption || undefined },
      { headers: { 'Content-Type': 'application/json', apikey: config.api_key } },
    )
    const externalId = res.data?.key?.id ?? res.data?.id ?? undefined
    return { ok: true, externalId }
  } catch (err: any) {
    return { ok: false, error: err.response?.data?.message || err.message }
  }
}

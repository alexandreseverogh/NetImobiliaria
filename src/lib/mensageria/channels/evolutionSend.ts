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

export type EvolutionMediaKind = 'image' | 'video' | 'document'

/** Envia imagem, vídeo ou documento (PDF) por URL pública. `kind` default: imagem (uso do bot). */
export async function sendEvolutionMedia(
  config: EvolutionInboxConfig,
  toPhone: string,
  mediaUrl: string,
  caption?: string,
  opts?: { kind?: EvolutionMediaKind; fileName?: string; mimetype?: string },
): Promise<{ ok: boolean; externalId?: string; error?: string }> {
  if (!config.api_url || !config.api_key || !config.instance) {
    return { ok: false, error: 'Inbox sem credenciais Evolution configuradas' }
  }

  try {
    // A Evolution 2.x só aceita base64 cru (sem prefixo data:) ou URL pública resolvível pelo
    // próprio servidor dela. Como o arquivo fica no storage interno (ex.: minio:9000), baixamos
    // aqui no servidor da app e enviamos em base64 — o único formato que o provider aceita.
    const fileRes = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 30000 })
    const base64 = Buffer.from(fileRes.data).toString('base64')
    const res = await axios.post(
      `${config.api_url}/message/sendMedia/${config.instance}`,
      {
        number: normalizePhone(toPhone),
        mediatype: opts?.kind ?? 'image',
        media: base64,
        caption: caption || undefined,
        fileName: opts?.fileName || undefined,
        mimetype: opts?.mimetype || undefined,
      },
      { headers: { 'Content-Type': 'application/json', apikey: config.api_key } },
    )
    const externalId = res.data?.key?.id ?? res.data?.id ?? undefined
    return { ok: true, externalId }
  } catch (err: any) {
    return { ok: false, error: err.response?.data?.message || err.message }
  }
}

/** Envia áudio como nota de voz (sendWhatsAppAudio). `encoding: true` pede à Evolution a conversão para opus. */
export async function sendEvolutionAudio(
  config: EvolutionInboxConfig,
  toPhone: string,
  audioUrl: string,
): Promise<{ ok: boolean; externalId?: string; error?: string }> {
  if (!config.api_url || !config.api_key || !config.instance) {
    return { ok: false, error: 'Inbox sem credenciais Evolution configuradas' }
  }

  try {
    // Mesmo motivo do sendEvolutionMedia: a Evolution só aceita base64 ou URL que ela alcance.
    // Baixamos o áudio aqui e enviamos em base64; `encoding: true` converte para opus.
    const fileRes = await axios.get(audioUrl, { responseType: 'arraybuffer', timeout: 30000 })
    const base64 = Buffer.from(fileRes.data).toString('base64')
    const res = await axios.post(
      `${config.api_url}/message/sendWhatsAppAudio/${config.instance}`,
      { number: normalizePhone(toPhone), audio: base64, encoding: true },
      { headers: { 'Content-Type': 'application/json', apikey: config.api_key } },
    )
    const externalId = res.data?.key?.id ?? res.data?.id ?? undefined
    return { ok: true, externalId }
  } catch (err: any) {
    return { ok: false, error: err.response?.data?.message || err.message }
  }
}

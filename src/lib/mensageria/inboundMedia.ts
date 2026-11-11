/**
 * Mídia recebida pelo WhatsApp (via Evolution). Baixa o arquivo pelo endpoint da Evolution,
 * grava no Object Storage e devolve o tipo da mensagem + anexo, para a Mensageria exibir.
 *
 * Reações (emoji sobre outra mensagem) não são mídia: viram um texto curto ("Reagiu 👍").
 */
import { createHash } from 'crypto'
import axios from 'axios'
import pool from '@/lib/database/connection'
import { uploadToS3 } from '@/lib/storage/s3-client'
import type { ContentType } from './ingest'

export interface InboundMedia {
  contentType: ContentType
  content: string | null
  attachments: { url: string; mimetype?: string; name?: string }[]
}

const MEDIA_KINDS: Record<string, { contentType: ContentType; label: string; ext: string }> = {
  imageMessage: { contentType: 'image', label: 'Imagem', ext: 'jpg' },
  audioMessage: { contentType: 'audio', label: 'Áudio', ext: 'ogg' },
  videoMessage: { contentType: 'file', label: 'Vídeo', ext: 'mp4' },
  documentMessage: { contentType: 'file', label: 'Documento', ext: 'bin' },
  stickerMessage: { contentType: 'image', label: 'Figurinha', ext: 'webp' },
}

/** Descobre o tipo de mídia de uma mensagem Evolution, ou null se for texto comum. */
export function detectMediaKind(message: any): string | null {
  for (const key of Object.keys(MEDIA_KINDS)) if (message?.[key]) return key
  return null
}

/** Texto de reação com emoji (ex.: 👍), ou null se não for reação. */
export function reactionText(message: any): string | null {
  const r = message?.reactionMessage
  if (!r) return null
  const emoji: string = r.text || ''
  return emoji ? `Reagiu ${emoji}` : 'Removeu reação'
}

async function getEvolutionConfig(tenantId: string) {
  const { rows } = await pool.query(
    `SELECT evolution_api_url, evolution_api_key, evolution_instance FROM public.tenants WHERE id = $1`,
    [tenantId],
  )
  return rows[0] as { evolution_api_url: string | null; evolution_api_key: string | null; evolution_instance: string | null } | undefined
}

/**
 * Baixa a mídia pela Evolution e grava no Object Storage. Se algo falhar, devolve a mensagem sem
 * anexo (o registro continua existindo e a falha fica no log), nunca derruba a ingestão.
 */
export async function buildInboundMedia(tenantId: string, key: any, message: any): Promise<InboundMedia | null> {
  const reaction = reactionText(message)
  if (reaction) return { contentType: 'text', content: reaction, attachments: [] }

  const kind = detectMediaKind(message)
  if (!kind) return null
  const meta = MEDIA_KINDS[kind]
  const caption: string | null = message?.[kind]?.caption || null

  try {
    const cfg = await getEvolutionConfig(tenantId)
    if (!cfg?.evolution_api_url || !cfg?.evolution_api_key || !cfg?.evolution_instance) {
      throw new Error('tenant sem credenciais Evolution para baixar mídia')
    }
    const res = await axios.post(
      `${cfg.evolution_api_url}/chat/getBase64FromMediaMessage/${cfg.evolution_instance}`,
      { message: { key }, convertToMp4: false },
      { headers: { apikey: cfg.evolution_api_key, 'Content-Type': 'application/json' }, timeout: 30000 },
    )
    const base64: string | undefined = res.data?.base64
    const mimetype: string = res.data?.mimetype || message?.[kind]?.mimetype || 'application/octet-stream'
    if (!base64) throw new Error('Evolution não devolveu o arquivo')

    const buffer = Buffer.from(base64.replace(/^data:[^;]+;base64,/, ''), 'base64')
    const hash = createHash('md5').update(buffer).digest('hex').substring(0, 12)
    const s3Key = `mensageria/${tenantId}/${Date.now()}-${hash}.${meta.ext}`
    const uploaded = await uploadToS3(s3Key, buffer, mimetype)
    if (!uploaded) throw new Error('Object Storage não configurado')

    return {
      contentType: meta.contentType,
      content: caption,
      attachments: [{ url: uploaded.url, mimetype, name: message?.[kind]?.fileName || undefined }],
    }
  } catch (err) {
    console.error(`[inboundMedia] falha ao baixar ${kind} (mensagem registrada sem anexo):`, err)
    return { contentType: 'text', content: `[${meta.label} não pôde ser recebido]`, attachments: [] }
  }
}

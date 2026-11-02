import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { processInboundWhatsAppMessage } from '@/lib/whatsapp/inboundProcessor'
import { uploadToS3 } from '@/lib/storage/s3-client'
import { createHash } from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Mapeia o tipo de mídia inbound pra contentType/extensão. A Evolution (com `webhookBase64:
 * true` na config do webhook, ver docs/CHECKPOINT.md) embute o conteúdo já decodificado em
 * `entry.message.base64` (sibling de audioMessage/imageMessage/etc, nunca dentro deles) — sem
 * isso, o media key só existe no device do WhatsApp, inacessível depois do fato.
 */
const MEDIA_FIELDS: Array<{ key: string; contentType: 'audio' | 'image' | 'file' }> = [
  { key: 'audioMessage', contentType: 'audio' },
  { key: 'imageMessage', contentType: 'image' },
  { key: 'videoMessage', contentType: 'file' },
  { key: 'documentMessage', contentType: 'file' },
  { key: 'stickerMessage', contentType: 'image' },
]

function extensionFromMimetype(mimetype: string | undefined): string {
  const mime = (mimetype || '').split(';')[0].trim().toLowerCase()
  const map: Record<string, string> = {
    'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/aac': 'aac',
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    'video/mp4': 'mp4', 'video/3gpp': '3gp',
    'application/pdf': 'pdf',
  }
  return map[mime] || mime.split('/')[1]?.replace(/[^a-z0-9]/g, '') || 'bin'
}

/**
 * Faz upload da mídia inbound (já decodificada pela Evolution) pro MinIO e retorna a URL
 * pública — mesmo bucket/padrão já usado pra mídia de saída (ver botAdapter.ts). Best-effort:
 * sem S3 configurado ou qualquer falha, retorna null (mensagem segue como texto, sem anexo).
 */
async function uploadInboundMedia(
  tenantId: string,
  phone: string,
  base64: string,
  mimetype: string | undefined,
): Promise<string | null> {
  try {
    const buffer = Buffer.from(base64, 'base64')
    const ext = extensionFromMimetype(mimetype)
    const hash = createHash('md5').update(buffer).digest('hex').substring(0, 8)
    const s3Key = `mensageria/${tenantId}/${phone}/${Date.now()}_${hash}.${ext}`
    const result = await uploadToS3(s3Key, buffer, mimetype || 'application/octet-stream')
    return result?.url ?? null
  } catch (err) {
    console.error('[evolution-webhook] falha ao subir mídia inbound pro storage:', err)
    return null
  }
}

/**
 * POST https://artemis4.com.br/api/public/evolution/webhook?token={evolution_webhook_secret}
 *
 * Adaptador FINO da Evolution API (WhatsApp Business) — só autentica a requisição e normaliza
 * o payload específico da Evolution. Toda a lógica de negócio (atribuição de CTA/campanha,
 * criação de lead no CRM, ligação com a Mensageria) vive em processInboundWhatsAppMessage
 * (src/lib/whatsapp/inboundProcessor.ts), agnóstica de provider — pra plugar outro provider
 * (ex.: Meta WhatsApp Cloud API oficial) no futuro, basta escrever outro adaptador fino igual
 * a este chamando a mesma função. Ver docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §9.3.
 *
 * Recebe eventos MESSAGES_UPSERT da Evolution API. Quando a mensagem contém [ref:xxx] (campanha
 * real desta plataforma ou mecanismo de CTA externo), a atribuição é resolvida automaticamente.
 * Sem [ref:], o lead nasce como WhatsApp orgânico.
 *
 * Autenticação: query param ?token= mapeia para tenants.evolution_webhook_secret
 *               (ou clientes.evolution_webhook_secret, se o cliente tiver número próprio —
 *               seção 14.9 do plano) + verifica se payload.instance bate com a instância
 *               configurada em quem o token identificou.
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

  // 2. Identificar tenant (e opcionalmente cliente) pelo token + instância. Checa primeiro
  // clientes.evolution_webhook_secret (mais específico — cliente com WhatsApp próprio); se
  // não bater, cai para tenants.evolution_webhook_secret (número principal, comportamento
  // original). Ver PLANO_MENSAGERIA.md seção 14.9.
  const instance: string = body?.instance || ''
  let tenant: { id: string; slug: string; evolution_instance: string | null }
  let ownerClientId: string | null = null

  const { rows: clientMatchRows } = await pool.query(
    `SELECT c.uuid AS client_id, c.tenant_id, c.evolution_instance, t.slug AS tenant_slug
       FROM public.clientes c
       JOIN public.tenants t ON t.id = c.tenant_id
      WHERE c.evolution_webhook_secret = $1 AND t.status = 'active' LIMIT 1`,
    [token],
  )
  if (clientMatchRows[0]) {
    const cm = clientMatchRows[0]
    tenant = { id: cm.tenant_id, slug: cm.tenant_slug, evolution_instance: cm.evolution_instance }
    ownerClientId = cm.client_id
  } else {
    const { rows: tenantRows } = await pool.query(
      `SELECT id, slug, evolution_instance FROM public.tenants
        WHERE evolution_webhook_secret = $1 AND status = 'active' LIMIT 1`,
      [token],
    )
    if (!tenantRows[0]) return NextResponse.json({ ok: false, error: 'token inválido' }, { status: 401 })
    tenant = tenantRows[0]
  }

  // Verificação secundária: instância bate com a configurada em quem o token identificou
  if (tenant.evolution_instance && instance && tenant.evolution_instance !== instance) {
    return NextResponse.json({ ok: false, error: 'instância não corresponde' }, { status: 403 })
  }

  // 3. Extrair dados da mensagem (formato específico da Evolution API)
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
    const pushName: string | null = entry?.pushName || null

    // Extrair texto da mensagem (suporta conversation, extendedText, imageCaption)
    const msgText: string =
      entry?.message?.conversation ||
      entry?.message?.extendedTextMessage?.text ||
      entry?.message?.imageMessage?.caption ||
      entry?.message?.videoMessage?.caption ||
      entry?.message?.documentMessage?.caption ||
      ''

    // Detecta mídia (áudio/imagem/vídeo/documento/sticker) — a Evolution embute o conteúdo já
    // decodificado em `entry.message.base64` (sibling do campo de tipo), só quando o webhook
    // da instância está configurado com `webhookBase64: true`.
    const mediaField = MEDIA_FIELDS.find((f) => entry?.message?.[f.key])
    const mediaBase64: string | undefined = entry?.message?.base64
    let contentType: 'text' | 'image' | 'audio' | 'file' = 'text'
    let attachments: Array<{ url: string }> = []
    if (mediaField && mediaBase64) {
      const mimetype = entry?.message?.[mediaField.key]?.mimetype
      const mediaUrl = await uploadInboundMedia(tenant.id, phone, mediaBase64, mimetype)
      if (mediaUrl) {
        contentType = mediaField.contentType
        attachments = [{ url: mediaUrl }]
      }
    }

    if (!msgText && !phone && attachments.length === 0) continue

    // 4. Normaliza e delega toda a lógica de negócio (atribuição + lead + Mensageria) pro
    // processador agnóstico de provider.
    await processInboundWhatsAppMessage({
      tenantId: tenant.id,
      ownerClientId,
      phone,
      pushName,
      text: msgText || null,
      contentType,
      attachments,
      externalMessageId: entry?.key?.id ?? null,
    }).catch((err) => {
      console.error('[evolution-webhook] processInboundWhatsAppMessage falhou:', err)
    })
  }

  // Evolution espera resposta rápida (< 5s)
  return NextResponse.json({ ok: true })
}

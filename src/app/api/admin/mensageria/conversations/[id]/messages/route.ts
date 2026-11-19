import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { createHash } from 'crypto'
import { MAX_ATTACHMENT_BYTES, MAX_ATTACHMENT_MB, attachmentTooLargeMessage } from '@/lib/mensageria/attachmentLimits'
import { sendWhatsAppMessage, sendWhatsAppMedia, sendWhatsAppAudio } from '@/lib/mensageria/channels/dispatch'
import { uploadToS3 } from '@/lib/storage/s3-client'
import { publishMensageriaEvent } from '@/lib/mensageria/realtime'
import { checkFirstResponseBreach } from '@/lib/mensageria/sla'
import { resolveMensageriaScope, isTenantAdminFromPayload, scopeToSql } from '@/lib/mensageria/visibilityScope'
import { touchPendencyByConversation } from '@/lib/crm/pendencia/pendencyState'
import { recomputeConversationBola } from '@/lib/mensageria/pendency'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/mensageria/conversations/[id]/messages
 * Envio outbound (agente responde na thread) — composer da coluna 3 (seção 8.1).
 * Body: { content: string, isPrivate?: boolean }
 *
 * Grava a mensagem primeiro (fonte de verdade é o banco), depois tenta o envio
 * real pelo canal. Se o envio falhar, a mensagem permanece com delivery_status='failed'
 * mas segue visível na thread — o atendente vê a falha e pode tentar de novo.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Aceita JSON (texto) ou multipart (texto + anexo opcional: imagem, PDF ou áudio).
  let content = ''
  let isPrivate = false
  let file: File | null = null
  const isMultipart = (request.headers.get('content-type') || '').includes('multipart/form-data')
  if (isMultipart) {
    const form = await request.formData()
    content = String(form.get('content') || '').trim()
    isPrivate = form.get('isPrivate') === 'true'
    const f = form.get('file')
    file = f instanceof File && f.size > 0 ? f : null
  } else {
    const body = await request.json().catch(() => ({}))
    content = (body.content || '').trim()
    isPrivate = body.isPrivate === true
  }
  if (!content && !file) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })

  // Tipo do anexo pelo MIME real enviado pelo navegador. Áudio vira nota de voz; imagem e PDF
  // seguem como mídia. Qualquer outro tipo é recusado — nada de executável chega ao contato.
  let attachKind: 'image' | 'audio' | 'document' | null = null
  if (file) {
    const mime = file.type || ''
    if (mime.startsWith('image/')) attachKind = 'image'
    else if (mime.startsWith('audio/')) attachKind = 'audio'
    else if (mime === 'application/pdf') attachKind = 'document'
    else return NextResponse.json({ error: 'Tipo de arquivo não suportado (use imagem, PDF ou áudio).' }, { status: 400 })
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: attachmentTooLargeMessage(file.name, file.size), code: 'ATTACHMENT_TOO_LARGE', maxMb: MAX_ATTACHMENT_MB }, { status: 413 })
    }
  }

  // Visibilidade gerencial (seção 16) — atendente fora do escopo não consegue responder
  // conversa alheia mesmo sabendo o id (defesa em profundidade, não só ocultação na lista).
  const scope = await resolveMensageriaScope(payload.tenantId, payload.userId, isTenantAdminFromPayload(payload))
  const convArgs: any[] = [params.id, payload.tenantId]
  const scoped = scopeToSql(scope, convArgs)
  const scopeClause = scoped.clause ? ` AND ${scoped.clause}` : ''

  const { rows: convRows } = await pool.query(
    `SELECT c.id, c.tenant_id, COALESCE(ct.phone, ct.attributes->>'lid') AS phone, ib.channel_type, ib.provider, ib.config
       FROM mensageria.conversations c
       JOIN mensageria.contacts ct ON ct.id = c.contact_id
       JOIN mensageria.inboxes ib ON ib.id = c.inbox_id
      WHERE c.id = $1 AND c.tenant_id = $2${scopeClause}`,
    convArgs,
  )
  const conv = convRows[0]
  if (!conv) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  // Sobe o anexo para o Object Storage antes de gravar a mensagem (mesmo padrão das mídias recebidas).
  let attachment: { url: string; mimetype: string; name: string } | null = null
  if (file && attachKind) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const hash = createHash('md5').update(buffer).digest('hex').substring(0, 12)
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
    const s3Key = `mensageria/${payload.tenantId}/outbound/${Date.now()}-${hash}.${ext}`
    const uploaded = await uploadToS3(s3Key, buffer, file.type)
    if (!uploaded) return NextResponse.json({ error: 'Object Storage não configurado: não foi possível anexar o arquivo.' }, { status: 500 })
    attachment = { url: uploaded.url, mimetype: file.type, name: file.name }
  }
  // Documento (PDF) é gravado como 'file' — mesmo tipo usado na mídia recebida, que é o que a
  // bolha da thread sabe renderizar como link. 'document' é só o tipo de envio ao provider.
  const contentType = attachKind === 'document' ? 'file' : attachKind ?? 'text'
  // attachments é NOT NULL no banco: sem anexo grava lista vazia, nunca null.
  const attachmentsJson = JSON.stringify(attachment ? [attachment] : [])

  // 1. Grava a mensagem (nota interna nunca sai pelo canal)
  const { rows: msgRows } = await pool.query(
    `INSERT INTO mensageria.messages
       (tenant_id, conversation_id, direction, sender_type, sender_id, content, content_type, attachments, is_private, delivery_status)
     VALUES ($1,$2,'outbound','agent',$3,$4,$5,$6::jsonb,$7,$8)
     RETURNING id, created_at`,
    [payload.tenantId, params.id, payload.userId, content || null, contentType, attachmentsJson, isPrivate, 'sent'],
  )
  const messageId = msgRows[0].id

  // Linha do tempo do CRM: resposta do atendente a um contato com lead entra no histórico do
  // lead (mesmo critério do ingest). Nota interna não entra — não é comunicação com o cliente.
  if (!isPrivate) {
    await pool.query(
      `INSERT INTO public.lead_timeline (tenant_id, lead_uuid, tipo_origem, origem_id, occurred_at)
       SELECT $1, ct.lead_uuid, 'mensageria_message', $2, now()
         FROM mensageria.conversations c
         JOIN mensageria.contacts ct ON ct.id = c.contact_id
        WHERE c.id = $3 AND ct.lead_uuid IS NOT NULL
       ON CONFLICT (tipo_origem, origem_id) DO NOTHING`,
      [payload.tenantId, messageId, params.id],
    )
  }

  // Nota interna NÃO conta como 1ª resposta ao contato — só mensagens que de fato saem pelo canal.
  await pool.query(
    `UPDATE mensageria.conversations
        SET last_message_at = now(),
            first_response_at = CASE WHEN $2 THEN first_response_at ELSE COALESCE(first_response_at, now()) END
      WHERE id = $1`,
    [params.id, isPrivate],
  )
  if (!isPrivate) await checkFirstResponseBreach(params.id).catch(() => {})

  // G0 — pendência de atendimento (docs/PLANO_PENDENCIA_ATENDIMENTO.md): esta é a devolução
  // de bola mais importante do sistema — o atendente respondendo o cliente. Diferente de
  // checkFirstResponseBreach acima (que só olha a 1ª resposta e depois fica cego pra sempre),
  // o estado de pendência é contínuo e vale do 2º toque em diante.
  // Nota interna não devolve bola nenhuma — o motor canônico já filtra is_private, mas nem
  // chamamos aqui pra não gastar a query à toa.
  if (!isPrivate) {
    await touchPendencyByConversation(params.id).catch((err) => {
      console.error('[mensageria/messages] falha ao atualizar pendência de atendimento:', err)
    })
  }
  // "De quem é a bola" da conversa: nossa resposta pública devolve a bola ao contato.
  // Nota interna não devolve (recomputeConversationBola ignora is_private).
  await recomputeConversationBola(params.id).catch((err) => {
    console.error('[mensageria/messages] falha ao atualizar bola da conversa:', err)
  })

  // 2. Envio real pelo canal (pulado para notas internas)
  let sendResult: { ok: boolean; externalId?: string; error?: string } = { ok: true }
  if (!isPrivate && conv.channel_type === 'whatsapp') {
    // Assinatura do atendente: o contato vê quem o atende. Só o texto ENVIADO leva o nome;
    // a mensagem gravada e exibida na Caixa de Entrada continua exatamente como foi digitada.
    const { rows: agentRows } = await pool.query(
      `SELECT nome FROM public.users WHERE id = $1`,
      [payload.userId],
    )
    const agentName = agentRows[0]?.nome?.trim()
    if (attachment && attachKind === 'audio') {
      // Áudio vai como nota de voz; não há legenda nesse tipo, então o texto (se houver) segue à parte.
      sendResult = await sendWhatsAppAudio(conv.provider, conv.config, conv.phone, attachment.url, params.id)
    } else if (attachment && attachKind) {
      const caption = content ? (agentName ? `${agentName}: ${content}` : content) : (agentName ?? undefined)
      sendResult = await sendWhatsAppMedia(
        conv.provider, conv.config, conv.phone, attachment.url, caption, params.id,
        { kind: attachKind === 'document' ? 'document' : 'image', fileName: attachment.name, mimetype: attachment.mimetype },
      )
    } else {
      const textToSend = agentName ? `${agentName}: ${content}` : content
      sendResult = await sendWhatsAppMessage(conv.provider, conv.config, conv.phone, textToSend, params.id)
    }
    if (!sendResult.ok) {
      console.error(`[mensageria/messages] falha de envio (${attachKind ?? 'texto'}, msg ${messageId}):`, sendResult.error)
    }
    await pool.query(
      `UPDATE mensageria.messages
          SET delivery_status = $1, external_id = COALESCE($2, external_id)
        WHERE id = $3`,
      [sendResult.ok ? 'sent' : 'failed', sendResult.externalId ?? null, messageId],
    )
  }

  publishMensageriaEvent(payload.tenantId, {
    type: 'message.created',
    conversationId: params.id,
    message: { id: messageId, direction: 'outbound', senderType: 'agent', content, contentType, attachments: attachment ? [attachment] : [], isPrivate, createdAt: msgRows[0].created_at },
  })

  return NextResponse.json({
    success: true,
    messageId,
    createdAt: msgRows[0].created_at,
    delivery: sendResult,
  })
}

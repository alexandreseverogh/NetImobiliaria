import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { sendEvolutionMessage } from '@/lib/mensageria/channels/evolutionSend'
import { publishMensageriaEvent } from '@/lib/mensageria/realtime'
import { checkFirstResponseBreach } from '@/lib/mensageria/sla'
import { resolveMensageriaScope, isTenantAdminFromPayload, scopeToSql } from '@/lib/mensageria/visibilityScope'

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

  const body = await request.json().catch(() => ({}))
  const content: string = (body.content || '').trim()
  const isPrivate: boolean = body.isPrivate === true
  if (!content) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })

  // Visibilidade gerencial (seção 16) — atendente fora do escopo não consegue responder
  // conversa alheia mesmo sabendo o id (defesa em profundidade, não só ocultação na lista).
  const scope = await resolveMensageriaScope(payload.tenantId, payload.userId, isTenantAdminFromPayload(payload))
  const convArgs: any[] = [params.id, payload.tenantId]
  const scoped = scopeToSql(scope, convArgs)
  const scopeClause = scoped.clause ? ` AND ${scoped.clause}` : ''

  const { rows: convRows } = await pool.query(
    `SELECT c.id, c.tenant_id, ct.phone, ib.channel_type, ib.config
       FROM mensageria.conversations c
       JOIN mensageria.contacts ct ON ct.id = c.contact_id
       JOIN mensageria.inboxes ib ON ib.id = c.inbox_id
      WHERE c.id = $1 AND c.tenant_id = $2${scopeClause}`,
    convArgs,
  )
  const conv = convRows[0]
  if (!conv) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  // 1. Grava a mensagem (nota interna nunca sai pelo canal)
  const { rows: msgRows } = await pool.query(
    `INSERT INTO mensageria.messages
       (tenant_id, conversation_id, direction, sender_type, sender_id, content, is_private, delivery_status)
     VALUES ($1,$2,'outbound','agent',$3,$4,$5,$6)
     RETURNING id, created_at`,
    [payload.tenantId, params.id, payload.userId, content, isPrivate, isPrivate ? 'sent' : 'sent'],
  )
  const messageId = msgRows[0].id

  // Nota interna NÃO conta como 1ª resposta ao contato — só mensagens que de fato saem pelo canal.
  await pool.query(
    `UPDATE mensageria.conversations
        SET last_message_at = now(),
            first_response_at = CASE WHEN $2 THEN first_response_at ELSE COALESCE(first_response_at, now()) END
      WHERE id = $1`,
    [params.id, isPrivate],
  )
  if (!isPrivate) await checkFirstResponseBreach(params.id).catch(() => {})

  // 2. Envio real pelo canal (pulado para notas internas)
  let sendResult: { ok: boolean; externalId?: string; error?: string } = { ok: true }
  if (!isPrivate && conv.channel_type === 'whatsapp') {
    sendResult = await sendEvolutionMessage(conv.config, conv.phone, content)
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
    message: { id: messageId, direction: 'outbound', senderType: 'agent', content, contentType: 'text', isPrivate, createdAt: msgRows[0].created_at },
  })

  return NextResponse.json({
    success: true,
    messageId,
    createdAt: msgRows[0].created_at,
    delivery: sendResult,
  })
}

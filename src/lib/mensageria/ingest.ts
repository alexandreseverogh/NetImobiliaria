/**
 * Ponto único de ingestão de mensagens do módulo Mensageria.
 * Qualquer canal (WhatsApp, formulário/CTA, manual, bot) normaliza sua
 * mensagem para o formato abaixo e chama ingestMessage() — daqui pra frente
 * o pipeline é o mesmo: dedupe de contato, thread aberta, idempotência.
 *
 * Ver docs/PLANO_MENSAGERIA.md seção 5.
 */
import pool from '@/lib/database/connection'
import { publishMensageriaEvent } from '@/lib/mensageria/realtime'
import { autoAssignConversation } from '@/lib/mensageria/autoAssign'
import { attachSlaPolicy, checkFirstResponseBreach } from '@/lib/mensageria/sla'

const SCHEMA = 'mensageria'

export type MessageDirection = 'inbound' | 'outbound'
export type SenderType = 'contact' | 'agent' | 'bot' | 'system'
export type ContentType = 'text' | 'image' | 'file' | 'audio' | 'template' | 'note'

export interface IngestContactInput {
  name?: string | null
  phone?: string | null   // já normalizado (dígitos) — normalização é responsabilidade do adapter
  email?: string | null
  avatarUrl?: string | null
  attributes?: Record<string, any>
}

export interface IngestMessageInput {
  tenantId: string
  clientId?: string | null
  inboxId: string
  contact: IngestContactInput
  direction: MessageDirection
  senderType: SenderType
  senderId?: string | null           // users.id quando senderType='agent'
  content?: string | null
  contentType?: ContentType
  attachments?: any[]
  externalId?: string | null         // id da mensagem no provider — garante idempotência
  isPrivate?: boolean
}

export interface IngestResult {
  contactId: string
  conversationId: string
  messageId: string | null           // null quando a mensagem já existia (idempotência por externalId)
  isNewContact: boolean
  isNewConversation: boolean
}

/**
 * Encontra ou cria um contato, deduplicando por telefone OU email dentro do tenant.
 * Enriquecimento é aditivo: nunca apaga um dado já existente com um valor vazio.
 */
async function findOrCreateContact(
  tenantId: string,
  clientId: string | null,
  input: IngestContactInput,
): Promise<{ id: string; isNew: boolean }> {
  const { name, phone, email, avatarUrl, attributes } = input

  if (!phone && !email) {
    throw new Error('ingestMessage: contato precisa de phone ou email para dedupe')
  }

  const { rows: existing } = await pool.query(
    `SELECT id FROM ${SCHEMA}.contacts
      WHERE tenant_id = $1
        AND ((phone = $2 AND phone IS NOT NULL) OR (email = $3 AND email IS NOT NULL))
      LIMIT 1`,
    [tenantId, phone ?? null, email ?? null],
  )

  if (existing[0]) {
    await pool.query(
      `UPDATE ${SCHEMA}.contacts
          SET name = COALESCE($1, name),
              phone = COALESCE(phone, $2),
              email = COALESCE(email, $3),
              avatar_url = COALESCE($4, avatar_url),
              attributes = attributes || $5::jsonb,
              updated_at = now()
        WHERE id = $6`,
      [name ?? null, phone ?? null, email ?? null, avatarUrl ?? null, JSON.stringify(attributes ?? {}), existing[0].id],
    )
    return { id: existing[0].id, isNew: false }
  }

  const { rows } = await pool.query(
    `INSERT INTO ${SCHEMA}.contacts (tenant_id, client_id, name, phone, email, avatar_url, attributes)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)
     RETURNING id`,
    [tenantId, clientId ?? null, name ?? null, phone ?? null, email ?? null, avatarUrl ?? null, JSON.stringify(attributes ?? {})],
  )
  return { id: rows[0].id, isNew: true }
}

/**
 * Encontra a conversa ABERTA mais recente do contato nesta inbox, ou cria uma nova.
 * Uma conversa resolvida/snoozed não é reaberta automaticamente — nova mensagem
 * do contato nesse caso abre uma conversa nova (comportamento do Chatwoot).
 */
async function findOrCreateConversation(
  tenantId: string,
  clientId: string | null,
  inboxId: string,
  contactId: string,
): Promise<{ id: string; isNew: boolean }> {
  const { rows: existing } = await pool.query(
    `SELECT id FROM ${SCHEMA}.conversations
      WHERE tenant_id = $1 AND inbox_id = $2 AND contact_id = $3 AND status IN ('open','pending')
      ORDER BY last_message_at DESC NULLS LAST
      LIMIT 1`,
    [tenantId, inboxId, contactId],
  )
  if (existing[0]) return { id: existing[0].id, isNew: false }

  const { rows } = await pool.query(
    `INSERT INTO ${SCHEMA}.conversations (tenant_id, client_id, inbox_id, contact_id, status)
     VALUES ($1,$2,$3,$4,'open')
     RETURNING id`,
    [tenantId, clientId ?? null, inboxId, contactId],
  )
  return { id: rows[0].id, isNew: true }
}

/**
 * Ingestão idempotente: se externalId já foi processado para este tenant, retorna
 * o resultado existente sem duplicar (mensagens reenviadas pelo provider, ex. Evolution).
 */
export async function ingestMessage(input: IngestMessageInput): Promise<IngestResult> {
  const { tenantId, clientId = null, inboxId, contact, direction, senderType, senderId, content,
          contentType = 'text', attachments = [], externalId = null, isPrivate = false } = input

  if (externalId) {
    const { rows: dup } = await pool.query(
      `SELECT id, conversation_id FROM ${SCHEMA}.messages WHERE tenant_id = $1 AND external_id = $2`,
      [tenantId, externalId],
    )
    if (dup[0]) {
      const { rows: conv } = await pool.query(
        `SELECT contact_id FROM ${SCHEMA}.conversations WHERE id = $1`,
        [dup[0].conversation_id],
      )
      return {
        contactId: conv[0]?.contact_id ?? '',
        conversationId: dup[0].conversation_id,
        messageId: null, // sinaliza "já existia" — chamador não deve tratar como nova mensagem
        isNewContact: false,
        isNewConversation: false,
      }
    }
  }

  const { id: contactId, isNew: isNewContact } = await findOrCreateContact(tenantId, clientId, contact)
  const { id: conversationId, isNew: isNewConversation } =
    await findOrCreateConversation(tenantId, clientId, inboxId, contactId)

  if (isNewConversation) {
    await autoAssignConversation(conversationId, inboxId).catch(() => {
      // não bloqueia a ingestão da mensagem — atribuição é best-effort
    })
    await attachSlaPolicy(conversationId, tenantId, inboxId).catch(() => {
      // SLA é best-effort — ausência de política ativa não é erro
    })
  }

  const { rows: msgRows } = await pool.query(
    `INSERT INTO ${SCHEMA}.messages
       (tenant_id, conversation_id, direction, sender_type, sender_id, content, content_type,
        attachments, external_id, is_private)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10)
     RETURNING id`,
    [tenantId, conversationId, direction, senderType, senderId ?? null, content ?? null, contentType,
     JSON.stringify(attachments), externalId, isPrivate],
  )
  const messageId = msgRows[0].id

  // last_message_at sempre avança; first_response_at só é marcado na 1ª mensagem outbound de agent/bot
  await pool.query(
    `UPDATE ${SCHEMA}.conversations
        SET last_message_at = now(),
            unread_count = CASE WHEN $2 = 'inbound' THEN unread_count + 1 ELSE unread_count END,
            first_response_at = CASE
              WHEN first_response_at IS NULL AND $2 = 'outbound' AND $3 IN ('agent','bot') THEN now()
              ELSE first_response_at
            END
      WHERE id = $1`,
    [conversationId, direction, senderType],
  )

  if (direction === 'outbound' && (senderType === 'agent' || senderType === 'bot')) {
    await checkFirstResponseBreach(conversationId).catch(() => {})
  }

  publishMensageriaEvent(tenantId, {
    type: 'message.created',
    conversationId,
    message: { id: messageId, direction, senderType, content: content ?? null, contentType, createdAt: new Date().toISOString() },
  })

  return { contactId, conversationId, messageId, isNewContact, isNewConversation }
}

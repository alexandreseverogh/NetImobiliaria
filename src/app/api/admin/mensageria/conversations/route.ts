import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { ingestMessage } from '@/lib/mensageria/ingest'
import { resolveManualInbox } from '@/lib/mensageria/inboxes'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/mensageria/conversations
 * Lista conversas do tenant (coluna 2 da inbox — ver docs/PLANO_MENSAGERIA.md 8.1).
 *
 * Query params: status ('open'|'pending'|'snoozed'|'resolved') · inboxId · assigneeId
 *               ('me'|<uuid>|'unassigned') · search (nome/telefone do contato)
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const sp = new URL(request.url).searchParams
  const status = sp.get('status')
  const inboxId = sp.get('inboxId')
  const assigneeId = sp.get('assigneeId')
  const search = sp.get('search')

  const where: string[] = ['c.tenant_id = $1']
  const args: any[] = [payload.tenantId]

  if (status) { args.push(status); where.push(`c.status = $${args.length}`) }
  if (inboxId) { args.push(inboxId); where.push(`c.inbox_id = $${args.length}`) }
  if (assigneeId === 'unassigned') where.push('c.assignee_id IS NULL')
  else if (assigneeId === 'me') { args.push(payload.userId); where.push(`c.assignee_id = $${args.length}`) }
  else if (assigneeId) { args.push(assigneeId); where.push(`c.assignee_id = $${args.length}`) }
  if (search) { args.push(`%${search}%`); where.push(`(ct.name ILIKE $${args.length} OR ct.phone ILIKE $${args.length})`) }

  const { rows } = await pool.query(
    `SELECT
       c.id, c.status, c.priority, c.unread_count, c.last_message_at, c.handled_by_bot,
       c.assignee_id, c.created_at,
       ct.id AS contact_id, ct.name AS contact_name, ct.phone AS contact_phone,
       ct.avatar_url AS contact_avatar_url, ct.lead_uuid,
       ib.channel_type, ib.name AS inbox_name,
       u.nome AS assignee_name,
       (SELECT m.content FROM mensageria.messages m
          WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_preview
     FROM mensageria.conversations c
     JOIN mensageria.contacts ct ON ct.id = c.contact_id
     JOIN mensageria.inboxes ib ON ib.id = c.inbox_id
     LEFT JOIN public.users u ON u.id = c.assignee_id
     WHERE ${where.join(' AND ')}
     ORDER BY c.last_message_at DESC NULLS LAST
     LIMIT 100`,
    args,
  )

  return NextResponse.json({
    conversations: rows.map((r) => ({
      id: r.id,
      status: r.status,
      priority: r.priority,
      unreadCount: r.unread_count,
      lastMessageAt: r.last_message_at,
      lastMessagePreview: r.last_message_preview,
      handledByBot: r.handled_by_bot,
      channelType: r.channel_type,
      inboxName: r.inbox_name,
      assignee: r.assignee_id ? { id: r.assignee_id, name: r.assignee_name } : null,
      contact: {
        id: r.contact_id,
        name: r.contact_name,
        phone: r.contact_phone,
        avatarUrl: r.contact_avatar_url,
        leadUuid: r.lead_uuid,
      },
      createdAt: r.created_at,
    })),
  })
}

/**
 * POST /api/admin/mensageria/conversations
 * Inicia uma conversa MANUAL — atendente registra um contato + interação que não
 * veio de um canal externo (ex.: ligação telefônica, atendimento presencial).
 * Body: { name?, phone?, email?, initialMessage? }
 */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { name, phone, email, initialMessage } = body

  if (!phone && !email) {
    return NextResponse.json({ error: 'Informe ao menos telefone ou e-mail do contato' }, { status: 400 })
  }

  const inboxId = await resolveManualInbox(payload.tenantId)
  const result = await ingestMessage({
    tenantId: payload.tenantId,
    inboxId,
    contact: { name: name || null, phone: phone || null, email: email || null },
    direction: 'outbound',
    senderType: 'agent',
    senderId: payload.userId,
    content: initialMessage || 'Conversa registrada manualmente.',
  })

  return NextResponse.json({ success: true, conversationId: result.conversationId, contactId: result.contactId })
}

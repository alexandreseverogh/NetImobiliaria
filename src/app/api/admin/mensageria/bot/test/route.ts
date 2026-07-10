import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { ingestMessage } from '@/lib/mensageria/ingest'

export const dynamic = 'force-dynamic'

// Contato fixo de teste — reutilizado entre chamadas (dedupe por telefone em ingestMessage),
// pra não poluir mensageria.contacts com um contato novo a cada teste do admin. Uma conversa
// de teste por (tenant, inbox) — trocar de inbox no seletor testa uma thread independente.
const TEST_PHONE = '5500000000001'

async function findTestConversation(tenantId: string, inboxId: string) {
  const { rows } = await pool.query(
    `SELECT c.id, c.handled_by_bot, bs.active AS bot_session_active
       FROM mensageria.conversations c
       JOIN mensageria.contacts ct ON ct.id = c.contact_id
       LEFT JOIN mensageria.bot_sessions bs ON bs.conversation_id = c.id
      WHERE c.tenant_id = $1 AND c.inbox_id = $2 AND ct.phone = $3
      ORDER BY c.created_at DESC
      LIMIT 1`,
    [tenantId, inboxId, TEST_PHONE],
  )
  return rows[0] ?? null
}

async function loadMessages(conversationId: string) {
  const { rows } = await pool.query(
    `SELECT id, direction, sender_type, content, created_at
       FROM mensageria.messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC`,
    [conversationId],
  )
  return rows.map((r: any) => ({
    id: r.id, direction: r.direction, senderType: r.sender_type, content: r.content, createdAt: r.created_at,
  }))
}

/** GET /api/admin/mensageria/bot/test?inboxId=... — estado atual da conversa de teste (se houver) */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const inboxId = new URL(request.url).searchParams.get('inboxId')
  if (!inboxId) return NextResponse.json({ error: 'inboxId é obrigatório' }, { status: 400 })

  const conv = await findTestConversation(payload.tenantId, inboxId)
  if (!conv) return NextResponse.json({ conversationId: null, handledByBot: null, botSessionActive: null, messages: [] })

  return NextResponse.json({
    conversationId: conv.id,
    handledByBot: conv.handled_by_bot,
    botSessionActive: conv.bot_session_active,
    messages: await loadMessages(conv.id),
  })
}

/**
 * POST /api/admin/mensageria/bot/test — simula uma mensagem inbound numa inbox e retorna o
 * estado completo da conversa de teste (histórico inteiro, não só a resposta nova). Exercita
 * o pipeline real (ingestMessage → maybeRunBot) — útil pro admin validar a config e testar
 * conversas de múltiplos turnos (handoff por maxTurns, memória, tool-use) antes de ativar
 * num canal de verdade.
 * Body: { inboxId, message }
 */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const inboxId: string = body.inboxId
  const message: string = (body.message || '').trim()
  if (!inboxId || !message) return NextResponse.json({ error: 'inboxId e message são obrigatórios' }, { status: 400 })

  const { rows: inboxRows } = await pool.query(
    `SELECT id, channel_type FROM mensageria.inboxes WHERE id = $1 AND tenant_id = $2`,
    [inboxId, payload.tenantId],
  )
  const inbox = inboxRows[0]
  if (!inbox) return NextResponse.json({ error: 'Inbox não encontrada' }, { status: 404 })
  if (inbox.channel_type === 'manual') {
    return NextResponse.json({ error: 'O canal Manual não passa pelo bot — escolha outra inbox.' }, { status: 400 })
  }

  const result = await ingestMessage({
    tenantId: payload.tenantId,
    inboxId,
    contact: { name: 'Teste do Bot (admin)', phone: TEST_PHONE },
    direction: 'inbound',
    senderType: 'contact',
    content: message,
  })

  const conv = await findTestConversation(payload.tenantId, inboxId)
  return NextResponse.json({
    conversationId: result.conversationId,
    handledByBot: conv?.handled_by_bot ?? null,
    botSessionActive: conv?.bot_session_active ?? null,
    messages: await loadMessages(result.conversationId),
  })
}

/** DELETE /api/admin/mensageria/bot/test?inboxId=... — reinicia a conversa de teste (apaga a thread) */
export async function DELETE(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const inboxId = new URL(request.url).searchParams.get('inboxId')
  if (!inboxId) return NextResponse.json({ error: 'inboxId é obrigatório' }, { status: 400 })

  const conv = await findTestConversation(payload.tenantId, inboxId)
  if (conv) {
    // messages/bot_sessions/conversation_events cascade via FK ON DELETE CASCADE
    await pool.query(`DELETE FROM mensageria.conversations WHERE id = $1`, [conv.id])
  }
  return NextResponse.json({ success: true })
}

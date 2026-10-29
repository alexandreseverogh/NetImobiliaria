/**
 * M4.4 — Widget de chat público (docs/PLANO_MENSAGERIA.md seção 8.4).
 * Endpoint SEM autenticação — qualquer visitante do site pode chamar. Superfície sensível:
 * rate-limit dedicado (webchatLimiter) + validação de tenant ativo + gate por bot_flows.is_active
 * ANTES de criar qualquer contato/conversa (evita poluir o banco com threads de tenants que nunca
 * ativaram o bot, e evita expor a existência de tenants inválidos via erro diferenciado).
 */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { ingestMessage } from '@/lib/mensageria/ingest'
import { resolveWebchatInbox } from '@/lib/mensageria/inboxes'
import { applyWebchatRateLimit } from '@/lib/security/rate-limiter'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'
import { describeEntityRowByIdentity } from '@/lib/mensageria/tools/genericResolver'

export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Contato sintético do visitante anônimo — mesma dedupe por "phone" já usada em todo canal. */
function webchatPhone(sessionId: string): string {
  return `web:${sessionId}`
}

/** Mesma cascata de resolução de bot_flows já usada em maybeRunBot() (botAdapter.ts) — cliente
 *  específico sobrepõe o flow tenant-wide; sem isso, um tenant que só ativou o bot PARA UM
 *  CLIENTE (nunca tenant-wide) reportaria erradamente "indisponível" numa página desse cliente. */
async function isBotActiveForTenant(tenantId: string, clientId: string | null): Promise<boolean> {
  const { rows: tenantRows } = await pool.query(
    `SELECT 1 FROM public.tenants WHERE id = $1 AND status = 'active'`,
    [tenantId],
  )
  if (!tenantRows[0]) return false

  const { rows: flowRows } = await pool.query(
    `SELECT 1 FROM mensageria.bot_flows
      WHERE tenant_id = $1 AND is_active = true AND (client_id = $2 OR client_id IS NULL)
      LIMIT 1`,
    [tenantId, clientId],
  )
  return !!flowRows[0]
}

/**
 * Valida que clientId pertence ao tenant — nunca confia num clientId solto vindo do widget
 * (query param/body, nunca autenticado). Mesma defesa em profundidade já aplicada nas rotas de
 * gestão da Base de Conhecimento (knowledge/route.ts) — aqui o risco é ainda mais direto: um
 * clientId inválido chegando até ingestMessage() criaria um contato/conversa com um escopo que
 * nunca resolve pra nenhum bot_flow/documento real, deixando o bot mudo sem nenhum erro visível.
 */
async function resolveValidClientId(tenantId: string, rawClientId: string | null): Promise<string | null> {
  if (!rawClientId || !UUID_RE.test(rawClientId)) return null
  const { rows } = await pool.query(
    `SELECT 1 FROM public.clientes WHERE uuid = $1 AND tenant_id = $2`,
    [rawClientId, tenantId],
  )
  return rows.length > 0 ? rawClientId : null
}

/** Escopa também por client_id — visitante que troca de página tenant-wide ↔ de um cliente
 *  específico (ex.: landing page própria do cliente) tem threads separadas, uma por escopo. */
async function findWebchatConversation(tenantId: string, clientId: string | null, sessionId: string) {
  const { rows } = await pool.query(
    `SELECT c.id, c.handled_by_bot
       FROM mensageria.conversations c
       JOIN mensageria.contacts ct ON ct.id = c.contact_id
       JOIN mensageria.inboxes ib ON ib.id = c.inbox_id
      WHERE c.tenant_id = $1 AND ib.channel_type = 'webchat' AND ct.phone = $2
        AND (c.client_id IS NOT DISTINCT FROM $3)
      ORDER BY c.created_at DESC
      LIMIT 1`,
    [tenantId, webchatPhone(sessionId), clientId],
  )
  return rows[0] ?? null
}

async function loadMessages(conversationId: string) {
  const { rows } = await pool.query(
    `SELECT id, direction, sender_type, content, content_type, attachments, created_at
       FROM mensageria.messages
      WHERE conversation_id = $1 AND is_private = false
      ORDER BY created_at ASC`,
    [conversationId],
  )
  return rows.map((r: any) => ({
    id: r.id, direction: r.direction, senderType: r.sender_type, content: r.content,
    contentType: r.content_type, attachments: r.attachments, createdAt: r.created_at,
  }))
}

/** GET ?tenantId=&sessionId=&clientId= — carrega o histórico existente (ao reabrir o widget).
 *  clientId é opcional — ausente/inválido/de outro tenant sempre degrada pra escopo tenant-wide,
 *  nunca erro (mesmo espírito de "falha silenciosa e segura" já usado no pageContext abaixo). */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenantId = searchParams.get('tenantId') || ''
  const sessionId = searchParams.get('sessionId') || ''
  if (!UUID_RE.test(tenantId) || !UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: 'tenantId e sessionId são obrigatórios (UUID)' }, { status: 400 })
  }
  const clientId = await resolveValidClientId(tenantId, searchParams.get('clientId'))

  const active = await isBotActiveForTenant(tenantId, clientId)
  if (!active) return NextResponse.json({ active: false, conversationId: null, messages: [] })

  const conv = await findWebchatConversation(tenantId, clientId, sessionId)
  if (!conv) return NextResponse.json({ active: true, conversationId: null, messages: [] })

  return NextResponse.json({ active: true, conversationId: conv.id, messages: await loadMessages(conv.id) })
}

/** POST { tenantId, sessionId, message, clientId? } — envia mensagem do visitante, bot responde
 *  internamente. clientId segue a mesma regra de degradação graciosa do GET acima. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const tenantId: string = body.tenantId || ''
  const sessionId: string = body.sessionId || ''
  const message: string = String(body.message || '').trim()
  const pageContext: { entity?: string; id?: string | number } | undefined = body.pageContext

  if (!UUID_RE.test(tenantId) || !UUID_RE.test(sessionId)) {
    return NextResponse.json({ error: 'tenantId e sessionId são obrigatórios (UUID)' }, { status: 400 })
  }
  if (!message || message.length > 2000) {
    return NextResponse.json({ error: 'Mensagem vazia ou muito longa (máx. 2000 caracteres)' }, { status: 400 })
  }
  const clientId = await resolveValidClientId(tenantId, body.clientId || null)

  const limited = await applyWebchatRateLimit(request, sessionId)
  if (limited) return limited

  const active = await isBotActiveForTenant(tenantId, clientId)
  if (!active) return NextResponse.json({ error: 'Chat indisponível para esta empresa no momento.' }, { status: 404 })

  // Contexto de página (M4.4) — resolvido fresco a cada mensagem, nunca persistido/cacheado, pra
  // nunca ficar desatualizado se o dado real mudar entre um turno e outro. Falha silenciosamente
  // (pageContext inválido/entidade não encontrada) — nunca derruba a conversa por causa disso.
  // Segmento resolvido já ciente do cliente — página de um cliente com segmento próprio (ex.:
  // Carros) nunca cai por engano na taxonomia do segmento do tenant.
  let botContext: string | null = null
  if (pageContext?.entity && pageContext?.id != null) {
    try {
      const segment = await resolveSegment(tenantId, clientId)
      botContext = await describeEntityRowByIdentity(segment?.id ?? null, tenantId, pageContext.entity, pageContext.id)
    } catch (err) {
      console.error('[public/mensageria/chat] falha ao resolver contexto de página:', err)
    }
  }

  const inboxId = await resolveWebchatInbox(tenantId)
  const result = await ingestMessage({
    tenantId,
    clientId,
    inboxId,
    contact: { name: 'Visitante do site', phone: webchatPhone(sessionId) },
    direction: 'inbound',
    senderType: 'contact',
    content: message,
    botContext,
  })

  return NextResponse.json({
    active: true,
    conversationId: result.conversationId,
    messages: await loadMessages(result.conversationId),
  })
}

/**
 * Bot do Mensageria (M4.1 + M4.2) — docs/PLANO_MENSAGERIA.md seções 4.3, 7, 14.5, 14.6-A, 18.1.
 *
 * O bot é só mais um sender_type: cada resposta dele é uma message normal via
 * ingestMessage(), então já aparece no painel e no analytics automaticamente.
 * Chamado por ingestMessage() a cada mensagem inbound de contato (best-effort —
 * uma falha aqui nunca deve quebrar a ingestão da mensagem original).
 */
import pool from '@/lib/database/connection'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'
import { resolvePromptTemplate } from '@/lib/intelligence/promptResolver'
import { renderPrompt } from '@/lib/intelligence/promptRenderer'
import { getLlmClientForCampaigns } from '@/lib/marketing/services/llmClient'
import type { LlmMessage } from '@/lib/marketing/services/llmClient'
import { getToolsForSegment, resolveEntity } from '@/lib/mensageria/tools/genericResolver'
import { ingestMessage } from '@/lib/mensageria/ingest'

const SCHEMA = 'mensageria'
const MAX_HISTORY = 20
const MAX_TOOL_ITERATIONS = 3
const DEFAULT_PERSONA_FALLBACK =
  'Você é um assistente virtual. Seja cordial, direto e responda em português do Brasil.'

interface HandoffRules {
  keywords?: string[]
  maxTurns?: number
}

interface ConversationContact {
  name: string | null
  phone: string | null
  email: string | null
}

function normalizeText(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
}

function matchesHandoffKeyword(text: string, keywords: string[]): boolean {
  const norm = normalizeText(text)
  return keywords.some((k) => norm.includes(normalizeText(k)))
}

async function loadContact(conversationId: string): Promise<ConversationContact | null> {
  const { rows } = await pool.query(
    `SELECT ct.name, ct.phone, ct.email
       FROM ${SCHEMA}.contacts ct
       JOIN ${SCHEMA}.conversations c ON c.contact_id = ct.id
      WHERE c.id = $1`,
    [conversationId],
  )
  return rows[0] ?? null
}

async function loadHistory(conversationId: string): Promise<LlmMessage[]> {
  const { rows } = await pool.query(
    `SELECT direction, sender_type, content
       FROM ${SCHEMA}.messages
      WHERE conversation_id = $1 AND is_private = false AND content_type = 'text' AND content IS NOT NULL
      ORDER BY created_at DESC
      LIMIT $2`,
    [conversationId, MAX_HISTORY],
  )
  return rows.reverse().map((r: any): LlmMessage => (
    r.direction === 'inbound' && r.sender_type === 'contact'
      ? { role: 'user', content: r.content }
      : { role: 'assistant', content: r.content }
  ))
}

// Persona é 100% dirigida por segmento, editada em /admin/master/prompts (template
// `mensageria_bot_persona`): resolvePromptTemplate faz segmento → fallback global.
// Não há override por tenant — o prompt por segmento é a única fonte (decisão do usuário).
async function resolvePersona(tenantId: string, segmentId: string | null): Promise<string> {
  const { rows } = await pool.query(`SELECT name FROM public.tenants WHERE id = $1`, [tenantId])
  const tenantName = rows[0]?.name || 'nossa empresa'

  const template = await resolvePromptTemplate('mensageria_bot_persona', segmentId)
  if (!template) return DEFAULT_PERSONA_FALLBACK
  return renderPrompt(template, { tenant_name: tenantName })
}

/** Uma resposta do bot, com tool-use quando o segmento tiver ferramentas de dados (M4.2). */
async function runBotReply(
  conversationId: string,
  tenantId: string,
  clientId: string | null,
): Promise<string | null> {
  const segment = await resolveSegment(tenantId, clientId)
  const persona = await resolvePersona(tenantId, segment?.id ?? null)
  const { tools, entities } = await getToolsForSegment(segment?.id ?? null, tenantId)
  const history = await loadHistory(conversationId)
  const llm = await getLlmClientForCampaigns()

  const messages: LlmMessage[] = [...history]
  let finalText = ''

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const { content, toolCalls } = await llm.completeWithTools(persona, messages, tools, 1024)

    if (toolCalls.length === 0) {
      finalText = content
      break
    }

    messages.push({ role: 'assistant', content, toolCalls })

    for (const call of toolCalls) {
      const entity = entities.get(call.name)
      let resultText: string
      try {
        const rows = entity ? await resolveEntity(entity, call.input, { tenantId }) : []
        resultText = JSON.stringify(rows)
      } catch (err) {
        resultText = JSON.stringify({ error: 'Falha ao consultar os dados.' })
        console.error('[mensageria/botAdapter] falha na ferramenta', call.name, err)
      }
      messages.push({ role: 'tool_result', toolCallId: call.id, content: resultText })
    }

    if (i === MAX_TOOL_ITERATIONS - 1) {
      // Última iteração já usada em tool calls — força uma resposta final sem novas ferramentas.
      const final = await llm.completeWithTools(persona, messages, [], 1024)
      finalText = final.content
    }
  }

  return finalText || null
}

async function handoffToHuman(conversationId: string, tenantId: string, clientId: string | null, inboxId: string, reason: string): Promise<void> {
  await pool.query(`UPDATE ${SCHEMA}.conversations SET handled_by_bot = false WHERE id = $1`, [conversationId])
  await pool.query(
    `INSERT INTO ${SCHEMA}.conversation_events (conversation_id, event_type, actor_id, payload)
     VALUES ($1, 'bot_handoff', NULL, $2::jsonb)`,
    [conversationId, JSON.stringify({ reason })],
  )
  await pool.query(`UPDATE ${SCHEMA}.bot_sessions SET active = false, updated_at = now() WHERE conversation_id = $1`, [conversationId])

  const contact = await loadContact(conversationId)
  if (!contact) return
  await ingestMessage({
    tenantId,
    clientId,
    inboxId,
    contact,
    direction: 'outbound',
    senderType: 'bot',
    content: 'Claro! Vou te conectar com um de nossos atendentes — só um instante. 🙂',
  })
}

/**
 * Ponto de entrada — chamado por ingestMessage() a cada mensagem inbound de contato.
 * Resolve se existe bot_flow ativo pra essa conversa e, se sim, roda uma rodada:
 * ou responde (com tool-use quando aplicável) ou transfere pra fila humana.
 */
export async function maybeRunBot(conversationId: string, tenantId: string): Promise<void> {
  const { rows: convRows } = await pool.query(
    `SELECT c.id, c.client_id, c.assignee_id, c.inbox_id, ib.channel_type
       FROM ${SCHEMA}.conversations c
       JOIN ${SCHEMA}.inboxes ib ON ib.id = c.inbox_id
      WHERE c.id = $1`,
    [conversationId],
  )
  const conv = convRows[0]
  if (!conv) return
  if (conv.channel_type === 'manual') return // atendimento manual (registrado pelo próprio atendente) nunca passa pelo bot
  if (conv.assignee_id) return // já está com um humano — bot não interfere

  const { rows: flowRows } = await pool.query(
    `SELECT id, handoff_rules
       FROM ${SCHEMA}.bot_flows
      WHERE tenant_id = $1 AND is_active = true AND (client_id = $2 OR client_id IS NULL)
      ORDER BY client_id NULLS LAST
      LIMIT 1`,
    [tenantId, conv.client_id],
  )
  const flow = flowRows[0]
  if (!flow) return

  const { rows: existingSession } = await pool.query(
    `SELECT state, active FROM ${SCHEMA}.bot_sessions WHERE conversation_id = $1`,
    [conversationId],
  )
  if (existingSession[0] && !existingSession[0].active) return // já foi feito handoff — bot fica quieto até um humano assumir

  const { rows: sessionRows } = await pool.query(
    `INSERT INTO ${SCHEMA}.bot_sessions (conversation_id, flow_id, state)
     VALUES ($1, $2, '{"turns":0}'::jsonb)
     ON CONFLICT (conversation_id) DO UPDATE SET flow_id = $2
     RETURNING state`,
    [conversationId, flow.id],
  )
  const turns = ((sessionRows[0]?.state?.turns as number | undefined) || 0) + 1

  const { rows: lastMsgRows } = await pool.query(
    `SELECT content FROM ${SCHEMA}.messages
      WHERE conversation_id = $1 AND direction = 'inbound' AND sender_type = 'contact'
      ORDER BY created_at DESC LIMIT 1`,
    [conversationId],
  )
  const lastInbound: string = lastMsgRows[0]?.content || ''

  const rules: HandoffRules = flow.handoff_rules || {}
  // maxTurns null/ausente = tenant não sobrepôs; segue o padrão do segmento (editável pelo
  // Master em /admin/master/segments) em vez de nunca disparar handoff por turno.
  const effectiveMaxTurns = rules.maxTurns ?? (await resolveSegment(tenantId, conv.client_id).catch(() => null))?.chatbot_max_turns_default ?? 6
  const keywordHit = !!rules.keywords?.length && matchesHandoffKeyword(lastInbound, rules.keywords)
  const turnsExceeded = turns >= effectiveMaxTurns

  if (keywordHit || turnsExceeded) {
    await handoffToHuman(conversationId, tenantId, conv.client_id, conv.inbox_id, keywordHit ? 'keyword' : 'max_turns')
    return
  }

  await pool.query(`UPDATE ${SCHEMA}.conversations SET handled_by_bot = true WHERE id = $1`, [conversationId])
  await pool.query(
    `UPDATE ${SCHEMA}.bot_sessions SET state = jsonb_set(state, '{turns}', $2::text::jsonb), updated_at = now() WHERE conversation_id = $1`,
    [conversationId, turns],
  )

  // runBotReply pode falhar de verdade (timeout/erro do provider LLM, não só conteúdo vazio) —
  // nesses casos o contato NÃO pode ficar sem nenhuma resposta; melhor uma mensagem genérica
  // de desculpa do que silêncio total (silêncio parece bot quebrado; a mensagem deixa claro
  // que ele está ativo e convida a tentar de novo).
  let reply: string | null = null
  try {
    reply = await runBotReply(conversationId, tenantId, conv.client_id)
  } catch (err) {
    console.error('[mensageria/botAdapter] falha ao gerar resposta do bot:', err)
  }
  const finalReply = reply || 'Desculpe, tive um problema para processar sua mensagem agora. Pode tentar de novo em instantes?'

  const contact = await loadContact(conversationId)
  if (!contact) return

  await ingestMessage({
    tenantId,
    clientId: conv.client_id,
    inboxId: conv.inbox_id,
    contact,
    direction: 'outbound',
    senderType: 'bot',
    content: finalReply,
  })
}

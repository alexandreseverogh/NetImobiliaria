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
import { getToolsForSegment, resolveEntity, type SegmentDataEntity } from '@/lib/mensageria/tools/genericResolver'
import { ingestMessage } from '@/lib/mensageria/ingest'
import { sendEvolutionMessage, sendEvolutionMedia, type EvolutionInboxConfig } from '@/lib/mensageria/channels/evolutionSend'

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

interface BotCard {
  header: string
  text: string
  images: string[]
}

// Resposta do bot: ou plana (texto + fotos em lote) ou agrupada em cartões por item (premium).
type BotReply =
  | { kind: 'flat'; text: string | null; images: string[] }
  | { kind: 'cards'; intro: string | null; outro: string | null; cards: BotCard[] }

const MAX_IMAGES_PER_REPLY = 4

/**
 * Colhe as URLs de imagem reais de UMA linha, a partir dos nomes das relations marcadas
 * `is_image` (Master → Segmentos → Dados do Bot). Genérico: não amarra a nome de campo/segmento.
 */
function collectRowImages(row: any, imageFields: string[]): string[] {
  const urls: string[] = []
  for (const field of imageFields) {
    const val = row?.[field]
    if (!Array.isArray(val)) continue
    for (const url of val) {
      if (typeof url === 'string' && url.trim()) urls.push(url)
    }
  }
  return urls
}

/**
 * Troca os campos de imagem (arrays de URL) por um flag textual antes de mandar pro LLM — ele
 * sabe QUEM tem foto (pra descrever/agrupar) mas nunca recebe a URL crua pra colar no texto.
 * As URLs reais ficam só no código, pro envio de mídia de verdade.
 */
function sanitizeRowForLlm(row: any, imageFields: string[]): any {
  if (imageFields.length === 0) return row
  const out: any = { ...row }
  for (const field of imageFields) {
    const has = collectRowImages(row, [field]).length > 0
    out[field] = has ? '<foto disponível — enviada automaticamente pela plataforma>' : '<sem foto disponível>'
  }
  return out
}

/** Extrai o 1º objeto JSON de uma resposta do LLM (tolera cercas ``` e texto ao redor). */
function parseJsonObject(raw: string): Record<string, any> | null {
  let s = (raw || '').trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) return null
  try {
    const obj = JSON.parse(s.slice(start, end + 1))
    return obj && typeof obj === 'object' ? obj : null
  } catch {
    return null
  }
}

/**
 * Chamada de formatação dedicada (sem tools): o código fornece as chaves exatas (ids) e o LLM
 * devolve JSON com o texto das infos pedidas por item. Casamento por chave = robusto (sem parsing
 * frágil de prosa livre). Retorna null se o JSON não vier válido → chamador cai no fluxo plano.
 */
async function buildCards(
  llm: Awaited<ReturnType<typeof getLlmClientForCampaigns>>,
  persona: string,
  messages: LlmMessage[],
  items: { key: string; header: string; images: string[] }[],
): Promise<{ intro: string | null; outro: string | null; cards: BotCard[] } | null> {
  const keys = items.map((it) => it.key)
  const instruction =
    `Formate a resposta final AGRUPADA POR ITEM. Para CADA um destes itens (identificados pela chave): ${keys.join(', ')}, ` +
    `escreva um texto curto e natural com as informações que o visitante pediu sobre aquele item — SEM repetir o nome/cabeçalho do item e SEM nenhum link ou URL de foto. ` +
    `Responda SOMENTE com um objeto JSON, sem nenhum texto fora dele, no formato: ` +
    `{"_intro": "<frase de abertura opcional>", "<chave>": "<texto do item>", "_outro": "<frase de fechamento opcional>"}. ` +
    `Use exatamente as chaves fornecidas. "_intro" e "_outro" são opcionais.`

  let raw = ''
  try {
    const res = await llm.completeWithTools(persona, [...messages, { role: 'user', content: instruction }], [], 800)
    raw = res.content || ''
  } catch (err) {
    console.error('[mensageria/botAdapter] falha na formatação de cartões:', err)
    return null
  }

  const parsed = parseJsonObject(raw)
  if (!parsed) return null

  const cards: BotCard[] = items.map((it) => ({
    header: it.header || 'Item',
    text: typeof parsed[it.key] === 'string' ? parsed[it.key] : '',
    images: it.images,
  }))
  const intro = typeof parsed._intro === 'string' && parsed._intro.trim() ? parsed._intro.trim() : null
  const outro = typeof parsed._outro === 'string' && parsed._outro.trim() ? parsed._outro.trim() : null
  return { intro, outro, cards }
}

/** Uma resposta do bot, com tool-use quando o segmento tiver ferramentas de dados (M4.2). */
async function runBotReply(
  conversationId: string,
  tenantId: string,
  clientId: string | null,
): Promise<BotReply> {
  const segment = await resolveSegment(tenantId, clientId)
  const persona = await resolvePersona(tenantId, segment?.id ?? null)
  const { tools, entities } = await getToolsForSegment(segment?.id ?? null, tenantId)
  const history = await loadHistory(conversationId)
  const llm = await getLlmClientForCampaigns()

  const messages: LlmMessage[] = [...history]
  let finalText = ''
  // Itens retornados (na ordem de 1ª aparição), por chave — cabeçalho + fotos reais de cada um.
  // Alimenta os cartões (agrupamento premium por item) e o envio de mídia.
  const itemsByKey = new Map<string, { header: string; images: string[] }>()
  let anyImages = false

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
        let resultPayload: any = rows
        if (entity) {
          const imageFields = entity.relations.filter((r) => r.is_image).map((r) => r.name)
          // Cabeçalho/rótulo do item: coluna marcada is_group_header; fallback = 1ª coluna texto
          // selecionável. Tudo dirigido por config — genérico p/ qualquer segmento.
          const headerCol = entity.columns.find((c) => c.is_group_header)?.name
            ?? entity.columns.find((c) => c.selectable && c.type === 'text')?.name

          let idx = 0
          let foundImagesInCall = false
          for (const row of rows) {
            idx++
            const urls = collectRowImages(row, imageFields)
            if (urls.length > 0) { anyImages = true; foundImagesInCall = true }
            const key = String(row?.[entity.identityColumn] ?? (headerCol ? row?.[headerCol] : undefined) ?? `item_${idx}`)
            if (!itemsByKey.has(key)) {
              const header = headerCol && row?.[headerCol] != null ? String(row[headerCol]) : ''
              itemsByKey.set(key, { header, images: urls })
            }
          }

          // Sanitiza as URLs de imagem antes de mostrar ao LLM (ele nunca cola link — não recebe).
          const sanitized = rows.map((r) => sanitizeRowForLlm(r, imageFields))

          // Avisos explícitos DENTRO dos dados, não só na persona — uma regra abstrata escrita
          // antes (ex.: "não invente campo não mapeado") não é seguida com confiabilidade. O
          // modelo segue muito melhor um aviso textual que chega junto com o resultado.
          const avisos: string[] = []
          if (rows.length === 0) {
            // Resultado vazio: o aviso de "campos disponíveis" NÃO entra — listar os nomes dos
            // campos com resultado vazio faz o LLM inferir "a entidade existe → temos o produto"
            // e responder "sim, temos" contradizendo o zero resultados.
            avisos.push('A consulta não retornou nenhum resultado com esses critérios. NÃO afirme que existe o que foi pedido; diga com clareza que não encontrou nada que combine e ofereça ajustar os critérios da busca.')
          } else {
            if (imageFields.length > 0 && !foundImagesInCall) {
              avisos.push('Nenhum dos itens abaixo tem foto disponível no momento. Diga, de forma natural, que não há fotos DESSES itens disponíveis agora. NUNCA diga que você "não pode exibir imagens" ou "não tem acesso a imagens" — você PODE mostrar fotos (a plataforma envia automaticamente quando existem); é só que estes itens específicos não têm foto agora.')
            }
            const availableFields = [
              ...entity.columns.filter((c) => c.selectable).map((c) => c.name),
              ...entity.relations.map((r) => r.name),
            ]
            avisos.push(
              `Os únicos campos disponíveis nestes dados são: ${availableFields.join(', ')}. Se o visitante perguntar algo fora dessa lista, diga claramente que não tem essa informação disponível no momento e sugira falar com um atendente — nunca estime, calcule ou invente um valor pra um campo que não veio aqui.`,
            )
          }
          resultPayload = { aviso: avisos.join(' '), resultados: sanitized }
        }
        resultText = JSON.stringify(resultPayload)
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

  const items = Array.from(itemsByKey.entries()).map(([key, v]) => ({ key, header: v.header, images: v.images }))
  const allImages: string[] = []
  for (const it of items) for (const u of it.images) if (!allImages.includes(u)) allImages.push(u)

  // Modo cartão: vários itens E pelo menos uma foto real → agrupa por item (cabeçalho + info + fotos
  // daquele item). Item único ou sem foto nenhuma → fluxo plano (texto + eventuais fotos em lote).
  if (items.length > 1 && anyImages) {
    const cards = await buildCards(llm, persona, messages, items)
    if (cards) return { kind: 'cards', intro: cards.intro, outro: cards.outro, cards: cards.cards }
    // formatação falhou → cai no plano abaixo, sem quebrar
  }

  return { kind: 'flat', text: finalText || null, images: allImages.slice(0, MAX_IMAGES_PER_REPLY) }
}

/**
 * Envio real pelo canal — hoje só WhatsApp (Evolution API). Falha aqui nunca derruba a
 * ingestão: a mensagem já está gravada e visível na plataforma; delivery_status registra
 * se o envio real deu certo, pro atendente ver e poder reagir a uma falha.
 */
async function deliverIfWhatsApp(
  messageId: string | null,
  channelType: string,
  config: EvolutionInboxConfig | null,
  phone: string | null,
  payload: { kind: 'text'; text: string } | { kind: 'image'; url: string },
): Promise<void> {
  if (!messageId || channelType !== 'whatsapp' || !config || !phone) return
  try {
    const result = payload.kind === 'text'
      ? await sendEvolutionMessage(config, phone, payload.text)
      : await sendEvolutionMedia(config, phone, payload.url)
    await pool.query(
      `UPDATE ${SCHEMA}.messages SET delivery_status = $1, external_id = COALESCE($2, external_id) WHERE id = $3`,
      [result.ok ? 'sent' : 'failed', result.externalId ?? null, messageId],
    )
    if (!result.ok) console.error('[mensageria/botAdapter] falha no envio real Evolution:', result.error)
  } catch (err) {
    console.error('[mensageria/botAdapter] exceção no envio real Evolution:', err)
  }
}

async function handoffToHuman(
  conversationId: string,
  tenantId: string,
  clientId: string | null,
  inboxId: string,
  channelType: string,
  config: EvolutionInboxConfig | null,
  phone: string | null,
  reason: string,
): Promise<void> {
  await pool.query(`UPDATE ${SCHEMA}.conversations SET handled_by_bot = false WHERE id = $1`, [conversationId])
  await pool.query(
    `INSERT INTO ${SCHEMA}.conversation_events (conversation_id, event_type, actor_id, payload)
     VALUES ($1, 'bot_handoff', NULL, $2::jsonb)`,
    [conversationId, JSON.stringify({ reason })],
  )
  await pool.query(`UPDATE ${SCHEMA}.bot_sessions SET active = false, updated_at = now() WHERE conversation_id = $1`, [conversationId])

  const contact = await loadContact(conversationId)
  if (!contact) return
  const text = 'Claro! Vou te conectar com um de nossos atendentes — só um instante. 🙂'
  const { messageId } = await ingestMessage({
    tenantId,
    clientId,
    inboxId,
    contact,
    direction: 'outbound',
    senderType: 'bot',
    content: text,
  })
  await deliverIfWhatsApp(messageId, channelType, config, phone, { kind: 'text', text })
}

/**
 * Ponto de entrada — chamado por ingestMessage() a cada mensagem inbound de contato.
 * Resolve se existe bot_flow ativo pra essa conversa e, se sim, roda uma rodada:
 * ou responde (com tool-use quando aplicável) ou transfere pra fila humana.
 */
export async function maybeRunBot(conversationId: string, tenantId: string): Promise<void> {
  const { rows: convRows } = await pool.query(
    `SELECT c.id, c.client_id, c.assignee_id, c.inbox_id, ib.channel_type, ib.config, ct.phone
       FROM ${SCHEMA}.conversations c
       JOIN ${SCHEMA}.inboxes ib ON ib.id = c.inbox_id
       JOIN ${SCHEMA}.contacts ct ON ct.id = c.contact_id
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
    await handoffToHuman(conversationId, tenantId, conv.client_id, conv.inbox_id, conv.channel_type, conv.config, conv.phone, keywordHit ? 'keyword' : 'max_turns')
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
  let reply: BotReply | null = null
  try {
    reply = await runBotReply(conversationId, tenantId, conv.client_id)
  } catch (err) {
    console.error('[mensageria/botAdapter] falha ao gerar resposta do bot:', err)
  }

  const contact = await loadContact(conversationId)
  if (!contact) return

  const sendBotText = async (text: string) => {
    const { messageId } = await ingestMessage({
      tenantId, clientId: conv.client_id, inboxId: conv.inbox_id, contact,
      direction: 'outbound', senderType: 'bot', content: text,
    })
    await deliverIfWhatsApp(messageId, conv.channel_type, conv.config, conv.phone, { kind: 'text', text })
  }

  const FALLBACK = 'Desculpe, tive um problema para processar sua mensagem agora. Pode tentar de novo em instantes?'

  if (!reply) {
    await sendBotText(FALLBACK)
    return
  }

  if (reply.kind === 'cards') {
    // Agrupamento premium por item: intro → (cabeçalho+info + fotos daquele item) por item → outro.
    if (reply.intro) await sendBotText(reply.intro)
    for (const card of reply.cards) {
      const body = card.text ? `${card.header}\n\n${card.text}` : card.header
      // 1 mensagem 'card' (cabeçalho+info + galeria) — representação premium na plataforma.
      const { messageId } = await ingestMessage({
        tenantId, clientId: conv.client_id, inboxId: conv.inbox_id, contact,
        direction: 'outbound', senderType: 'bot',
        content: body, contentType: 'card', attachments: card.images.map((url) => ({ url })),
      })
      // WhatsApp real não tem cartão: manda o texto e depois cada foto daquele item, em sequência.
      await deliverIfWhatsApp(messageId, conv.channel_type, conv.config, conv.phone, { kind: 'text', text: body })
      for (const url of card.images) {
        await deliverIfWhatsApp(messageId, conv.channel_type, conv.config, conv.phone, { kind: 'image', url })
      }
    }
    if (reply.outro) await sendBotText(reply.outro)
    return
  }

  // Fluxo plano: texto primeiro, depois as fotos em lote (mesma ordem de um atendente no WhatsApp).
  const images = reply.images
  const finalText = reply.text || (images.length > 0 ? null : FALLBACK)
  if (finalText) await sendBotText(finalText)
  for (const url of images) {
    const { messageId } = await ingestMessage({
      tenantId, clientId: conv.client_id, inboxId: conv.inbox_id, contact,
      direction: 'outbound', senderType: 'bot',
      content: null, contentType: 'image', attachments: [{ url }],
    })
    await deliverIfWhatsApp(messageId, conv.channel_type, conv.config, conv.phone, { kind: 'image', url })
  }
}

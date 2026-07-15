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
import { getToolsForSegment, resolveEntity, compareEntity, aggregateEntity, type SegmentDataEntity } from '@/lib/mensageria/tools/genericResolver'
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
  // Inclui 'card' junto com 'text' — os cartões (agrupamento por item) carregam o dado real
  // (bairro, preço, IPTU etc.) no `content`; excluí-los da história deixava o LLM sem nenhuma
  // memória do que "esses imóveis" significava no turno seguinte, forçando-o a pedir
  // esclarecimento em vez de reaproveitar/calcular sobre o que já tinha mostrado. Mensagens de
  // imagem pura (`content IS NULL`) continuam fora — não têm texto útil pro contexto.
  const { rows } = await pool.query(
    `SELECT direction, sender_type, content
       FROM ${SCHEMA}.messages
      WHERE conversation_id = $1 AND is_private = false AND content_type IN ('text', 'card') AND content IS NOT NULL
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

// Guarda-chuva de plataforma contra chamar ferramenta "no chute" — aplicado em CÓDIGO, não em
// texto de persona por segmento, pra valer automaticamente em TODO segmento (presente e futuro)
// sem depender de o Master lembrar de repetir essa regra em cada template. Bug real que motivou
// isso: perguntado algo sem relação real com nenhuma ferramenta (ex.: "estatuto de imóveis" —
// nada a ver com tipos/preço/bairro), o bot ainda assim chamou uma ferramenta por semelhança
// solta com a descrição dela ("o que a empresa oferece") e respondeu com um dado real, mas que
// não respondia a pergunta feita — pior que "não sei", porque parece uma resposta certa.
const TOOL_GUARDRAIL =
  '\n\n- Antes de chamar qualquer ferramenta de consulta, confirme que a pergunta do visitante corresponde CLARAMENTE ao que aquela ferramenta cobre (conforme a descrição dela). Se a pergunta usar um termo que você não reconhece, for ambígua, ou não tiver uma correspondência clara e direta com nenhuma ferramenta disponível, NÃO chame nenhuma ferramenta baseado num palpite — diga que não entendeu ou que não tem essa informação, e peça ao visitante para explicar melhor o que ele quer saber. Nunca responda com o dado de uma ferramenta que só parece relacionado por semelhança solta com a pergunta.'

// Bug real: perguntado algo que CLARAMENTE deveria consultar uma ferramenta (ex.: "quais imóveis
// vocês têm no bairro X"), o modelo às vezes simplesmente NÃO chama nenhuma ferramenta naquele
// turno e responde "não encontramos" do nada — negando a existência de algo real sem ter
// consultado. É o oposto do risco que o TOOL_GUARDRAIL acima cobre (chamar ferramenta "no chute"
// sem relação com a pergunta) — aqui o problema é o modelo deixar de chamar quando deveria.
const NEVER_ANSWER_WITHOUT_TOOL_GUARDRAIL =
  '\n\n- Para qualquer pergunta que peça um dado concreto e verificável (localização, disponibilidade, preço, características, existência de um item específico), você DEVE chamar a ferramenta de consulta correspondente ANTES de responder — mesmo que a pergunta pareça repetir algo já discutido antes na conversa. NUNCA afirme "não encontramos" ou "não temos" algo sem ter acabado de consultar a ferramenta NESTE turno — uma negação sem ter consultado é pior que não responder, porque pode negar algo que existe de verdade.'

// Bug real: perguntado sobre fotos numa pergunta de acompanhamento ("tem fotos dos imóveis?",
// depois de já ter listado alguns itens sem foto antes), o bot NÃO chamou a ferramenta de novo —
// respondeu só de memória da conversa, e como o aviso "nunca diga que não pode exibir imagens"
// só existe DENTRO do resultado de uma chamada de ferramenta (injetado por chamada, não é uma
// regra permanente), esse turno sem chamada nenhuma ficou sem essa proteção — o modelo caiu no
// comportamento padrão dele e disse que "não pode exibir fotos diretamente aqui", contradizendo
// a regra real da plataforma. Reforço permanente, fora do ciclo de tool-use, pra cobrir esse caso.
const PHOTO_FOLLOWUP_GUARDRAIL =
  '\n\n- Se o visitante perguntar sobre foto(s)/imagem(ns) a qualquer momento da conversa — mesmo sobre itens já mencionados antes sem foto —, sempre chame de novo a ferramenta de consulta pedindo a foto explicitamente; nunca responda sobre fotos só de memória do histórico, sem confirmar via ferramenta. Você NUNCA deve dizer que "não pode exibir imagens" ou "não pode mostrar fotos diretamente aqui" — isso é falso: quando existir foto real, a plataforma sempre envia ela de verdade como mensagem separada, automaticamente. Se, depois de consultar, não houver foto disponível, diga isso claramente — nunca invente uma desculpa sobre a sua própria capacidade de mostrar imagem.'

// Persona é 100% dirigida por segmento, editada em /admin/master/prompts (template
// `mensageria_bot_persona`): resolvePromptTemplate faz segmento → fallback global.
// Não há override por tenant — o prompt por segmento é a única fonte (decisão do usuário).
async function resolvePersona(tenantId: string, segmentId: string | null): Promise<string> {
  const { rows } = await pool.query(`SELECT name FROM public.tenants WHERE id = $1`, [tenantId])
  const tenantName = rows[0]?.name || 'nossa empresa'

  const template = await resolvePromptTemplate('mensageria_bot_persona', segmentId)
  const base = template ? renderPrompt(template, { tenant_name: tenantName }) : DEFAULT_PERSONA_FALLBACK
  return base + TOOL_GUARDRAIL + NEVER_ANSWER_WITHOUT_TOOL_GUARDRAIL + PHOTO_FOLLOWUP_GUARDRAIL
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
    `Analise a pergunta mais recente do visitante e os dados reais de cada item abaixo (identificados pela chave): ${keys.join(', ')}. ` +
    `Se a pergunta pedir uma LISTAGEM geral (ex.: "quais imóveis vocês têm", "mostre os imóveis disponíveis"), inclua TODOS os itens, um cabeçalho+texto cada. ` +
    `Se a pergunta pedir uma COMPARAÇÃO, CÁLCULO ou SELEÇÃO entre os itens (ex.: "qual tem o menor preço", "qual é mais barato somando preço e IPTU", "qual tem mais quartos") — calcule/compare usando os valores REAIS de cada item (nunca estime) e inclua card SOMENTE do(s) item(ns) que respondem à pergunta (pode ser 1 só, ou vários em caso de empate exato) — nesse caso "_intro" é OBRIGATÓRIO e deve explicar o cálculo/critério usado e citar os valores comparados. ` +
    `Para cada item que você decidir incluir, escreva um texto curto e natural com as informações relevantes — SEM repetir o nome/cabeçalho do item e SEM nenhum link ou URL de foto. ` +
    `Responda SOMENTE com um objeto JSON, sem nenhum texto fora dele, no formato: ` +
    `{"_intro": "<frase de abertura>", "<chave>": "<texto do item>", "_outro": "<frase de fechamento opcional>"}. ` +
    `Inclua no JSON APENAS as chaves dos itens que você decidiu manter — NÃO inclua chave de item que você descartou da resposta.`

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

  // Só vira card o item que o LLM de fato incluiu no JSON — uma pergunta de comparação/seleção
  // (ex.: "qual tem o menor preço?") deve resultar em 1 (ou poucos) cards, não um por item
  // retornado pela ferramenta. Sem esse filtro, a resposta sempre mostrava TODOS os itens, mesmo
  // quando o visitante pediu uma escolha específica entre eles.
  const cards: BotCard[] = items
    .filter((it) => typeof parsed[it.key] === 'string' && parsed[it.key].trim())
    .map((it) => ({ header: it.header || 'Item', text: parsed[it.key].trim(), images: it.images }))
  if (cards.length === 0) return null // formatação não selecionou nada válido → cai no fluxo plano

  const intro = typeof parsed._intro === 'string' && parsed._intro.trim() ? parsed._intro.trim() : null
  const outro = typeof parsed._outro === 'string' && parsed._outro.trim() ? parsed._outro.trim() : null
  return { intro, outro, cards }
}

/** Uma resposta do bot, com tool-use quando o segmento tiver ferramentas de dados (M4.2). */
async function runBotReply(
  conversationId: string,
  tenantId: string,
  clientId: string | null,
  extraContext?: string | null,
): Promise<BotReply> {
  const segment = await resolveSegment(tenantId, clientId)
  let persona = await resolvePersona(tenantId, segment?.id ?? null)
  // Contexto de página (M4.4 — widget público embutido numa página de item específico, ex.:
  // detalhe de imóvel) — hint textual só pra ESTE turno, resolvido fresco a cada chamada (nunca
  // fica obsoleto). Nunca vira mensagem visível na thread, só é lido pelo LLM.
  if (extraContext) persona += `\n\n- Contexto da página atual: ${extraContext}`
  const { tools, entities, compareEntities, aggregateEntities } = await getToolsForSegment(segment?.id ?? null, tenantId)
  const history = await loadHistory(conversationId)
  const llm = await getLlmClientForCampaigns()

  const messages: LlmMessage[] = [...history]
  let finalText = ''
  // Itens retornados (na ordem de 1ª aparição), por chave — cabeçalho + fotos reais de cada um.
  // Alimenta os cartões (agrupamento premium por item) e o envio de mídia.
  const itemsByKey = new Map<string, { header: string; images: string[] }>()
  let anyImages = false

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const { content, toolCalls: rawToolCalls } = await llm.completeWithTools(persona, messages, tools, 1024)

    if (rawToolCalls.length === 0) {
      finalText = content
      break
    }

    // Defesa contra nome de ferramenta inventado/com erro de digitação (ex.: "agrupart_imovel"
    // em vez de "agrupar_imovel") — bug real observado com modelo Groq gpt-oss-120b: ecoar essa
    // chamada de volta no histórico faz a PRÓXIMA chamada à API falhar com 400 ("tool call
    // validation failed"), porque o nome não existe em `tools`. Filtra ANTES de ecoar — o
    // histórico nunca carrega uma referência a ferramenta que não existe.
    const validNames = new Set<string>(
      Array.from(entities.keys()).concat(Array.from(compareEntities.keys()), Array.from(aggregateEntities.keys())),
    )
    const toolCalls = rawToolCalls.filter((c) => validNames.has(c.name))
    const invalidCalls = rawToolCalls.filter((c) => !validNames.has(c.name))
    if (invalidCalls.length > 0) {
      console.error('[mensageria/botAdapter] ferramenta inexistente chamada pelo LLM, descartada:', invalidCalls.map((c) => c.name))
    }

    messages.push({ role: 'assistant', content, toolCalls: toolCalls.length > 0 ? toolCalls : undefined })

    for (const call of toolCalls) {
      const entity = entities.get(call.name)
      const cmpEntity = compareEntities.get(call.name)
      const aggEntity = aggregateEntities.get(call.name)
      const activeEntity = entity ?? cmpEntity

      if (aggEntity) {
        // Agrupamento/contagem: não é uma listagem de itens (sem foto, sem cabeçalho de cartão,
        // sem paginação — GROUP BY já cobre 100% das categorias reais numa chamada só). Ramo
        // próprio, separado do fluxo de linhas normal.
        try {
          const agg = await aggregateEntity(aggEntity, call.input, { tenantId })
          if ('error' in agg) {
            messages.push({ role: 'tool_result', toolCallId: call.id, content: JSON.stringify({ aviso: agg.error }) })
          } else if (agg.grupos.length === 0) {
            messages.push({
              role: 'tool_result', toolCallId: call.id,
              content: JSON.stringify({ aviso: 'Nenhuma categoria encontrada com esses critérios. NÃO afirme que existe o que foi pedido; diga com clareza que não encontrou nada.' }),
            })
          } else {
            messages.push({
              role: 'tool_result', toolCallId: call.id,
              content: JSON.stringify({
                aviso: `Contagem real por "${agg.campo}", cobrindo TODAS as categorias que existem (não é uma amostra). Cite os valores exatamente como vieram — NUNCA invente uma categoria que não está nesta lista, nem omita uma que está.`,
                grupos: agg.grupos,
              }),
            })
          }
        } catch (err) {
          messages.push({ role: 'tool_result', toolCallId: call.id, content: JSON.stringify({ error: 'Falha ao consultar os dados.' }) })
          console.error('[mensageria/botAdapter] falha na ferramenta', call.name, err)
        }
        continue
      }

      let resultText: string
      try {
        let rows: any[]
        let compareInfo: { camposUsados: string[]; operacao: string; criterio: string } | null = null
        let pagingInfo: { totalCount: number; page: number; pageSize: number } | null = null

        if (entity) {
          const resolved = await resolveEntity(entity, call.input, { tenantId })
          rows = resolved.rows
          pagingInfo = { totalCount: resolved.totalCount, page: resolved.page, pageSize: resolved.pageSize }
        } else if (cmpEntity) {
          // Comparação/ranking: a aritmética roda em compareEntity() (código, não LLM) — o
          // resultado já vem com o(s) item(ns) vencedor(es) e o campo _total_calculado pronto.
          const cmp = await compareEntity(cmpEntity, call.input, { tenantId })
          if ('error' in cmp) {
            messages.push({ role: 'tool_result', toolCallId: call.id, content: JSON.stringify({ aviso: cmp.error }) })
            continue
          }
          rows = cmp.rows
          compareInfo = { camposUsados: cmp.camposUsados, operacao: cmp.operacao, criterio: cmp.criterio }
        } else {
          rows = []
        }

        let resultPayload: any = rows
        if (activeEntity) {
          const imageFields = activeEntity.relations.filter((r) => r.is_image).map((r) => r.name)
          // Intenção do visitante pra ESTA pergunta, extraída pelo LLM (nunca hardcoded por
          // palavra-chave) — ver addPhotoIntentParam. Sem pedido explícito, não coleta/envia
          // nenhuma foto, mesmo que a entidade tenha relations de imagem disponíveis.
          const wantsPhotos = call.input?.incluir_fotos === true || call.input?.incluir_fotos === 'true'
          // Cabeçalho/rótulo do item: coluna marcada is_group_header; fallback = 1ª coluna texto
          // selecionável. Tudo dirigido por config — genérico p/ qualquer segmento.
          const headerCol = activeEntity.columns.find((c) => c.is_group_header)?.name
            ?? activeEntity.columns.find((c) => c.selectable && c.type === 'text')?.name

          let idx = 0
          let foundImagesInCall = false
          for (const row of rows) {
            idx++
            const urls = wantsPhotos ? collectRowImages(row, imageFields) : []
            if (urls.length > 0) { anyImages = true; foundImagesInCall = true }
            const key = String(row?.[activeEntity.identityColumn] ?? (headerCol ? row?.[headerCol] : undefined) ?? `item_${idx}`)
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
            if (compareInfo) {
              // O item já foi selecionado pelo CÓDIGO — o LLM só narra, nunca recalcula.
              avisos.push(
                `O(s) item(ns) abaixo JÁ FORAM selecionados pelo sistema como resultado da comparação pedida (campo(s): ${compareInfo.camposUsados.join(' + ')}; critério: ${compareInfo.criterio}). O campo "_total_calculado" já traz o valor real somado/combinado de cada item — CITE esse valor exatamente como veio, NUNCA recalcule, arredonde ou estime por conta própria.`,
              )
            }
            if (imageFields.length > 0 && wantsPhotos && !foundImagesInCall) {
              avisos.push('Nenhum dos itens abaixo tem foto disponível no momento. Diga, de forma natural, que não há fotos DESSES itens disponíveis agora. NUNCA diga que você "não pode exibir imagens" ou "não tem acesso a imagens" — você PODE mostrar fotos (a plataforma envia automaticamente quando existem); é só que estes itens específicos não têm foto agora.')
            }
            if (pagingInfo && pagingInfo.totalCount > pagingInfo.page * pagingInfo.pageSize) {
              // Resultado cortado por paginação — o LLM precisa saber o total real pra nunca dar
              // a entender que isso é tudo que existe, e saber como pedir a próxima leva.
              const shown = Math.min(pagingInfo.page * pagingInfo.pageSize, pagingInfo.totalCount)
              avisos.push(
                `Estes são ${rows.length} de ${pagingInfo.totalCount} resultados reais que combinam com os critérios (mostrando até o item ${shown} de ${pagingInfo.totalCount}). Informe isso ao visitante de forma natural e pergunte se ele quer ver mais — se ele confirmar, chame esta mesma ferramenta de novo com os mesmos critérios e "pagina": "${pagingInfo.page + 1}".`,
              )
            }
            const availableFields = [
              ...activeEntity.columns.filter((c) => c.selectable).map((c) => c.name),
              ...activeEntity.relations.map((r) => r.name),
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
export async function maybeRunBot(conversationId: string, tenantId: string, extraContext?: string | null): Promise<void> {
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
    reply = await runBotReply(conversationId, tenantId, conv.client_id, extraContext)
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

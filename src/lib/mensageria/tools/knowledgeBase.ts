/**
 * RAG — Base de Conhecimento não-estruturada (docs/PLANO_MENSAGERIA.md §14.6-B, M4.3).
 *
 * Complementa o resolver genérico (genericResolver.ts, dados ESTRUTURADOS/exatos) com busca
 * híbrida (vetorial + full-text) sobre markdown livre (políticas, FAQ, condições comerciais)
 * por tenant/cliente. Escopo herdado igual a inboxes/bot_flows: client_id NULL = vale pra
 * todos os clientes do tenant; client_id setado = só aquele cliente.
 *
 * Embeddings sempre via Gemini text-embedding-004 (768 dims, ver llmClient.ts embedText) —
 * decisão fixa, independente do provider de CHAT configurado por tenant.
 */
import pool from '@/lib/database/connection'
import { embedText } from '@/lib/marketing/services/llmClient'

const SCHEMA = 'mensageria'

// Teto por chunk — folga suficiente pra um parágrafo real de política/FAQ sem estourar o
// contexto do LLM quando vários chunks entram na mesma resposta (top-K).
const CHUNK_MAX_CHARS = 1200

export interface KnowledgeDocument {
  id: string
  tenantId: string
  clientId: string | null
  title: string
  sourceType: string
  rawMarkdown: string
  originalFilename: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface RawChunk {
  headingPath: string | null
  text: string
}

/**
 * Quebra o markdown em chunks por seção (heading) + limite de tamanho, prefixando cada chunk
 * com o caminho de headings ("Vendas > Financiamento") — dá contexto pro LLM mesmo quando o
 * chunk isolado não repete o assunto por extenso.
 */
export function chunkMarkdown(markdown: string): RawChunk[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const chunks: RawChunk[] = []
  const headingStack: string[] = [] // por nível 1..6, índice = level-1
  let buffer: string[] = []

  const currentPath = () => headingStack.filter(Boolean).join(' > ') || null

  const flush = () => {
    const text = buffer.join('\n').trim()
    buffer = []
    if (!text) return
    // Chunk grande demais: quebra por parágrafo (linha em branco), sem cortar palavra no meio.
    if (text.length <= CHUNK_MAX_CHARS) {
      chunks.push({ headingPath: currentPath(), text })
      return
    }
    const paragraphs = text.split(/\n{2,}/)
    let piece = ''
    for (const p of paragraphs) {
      if (piece && (piece.length + p.length + 2) > CHUNK_MAX_CHARS) {
        chunks.push({ headingPath: currentPath(), text: piece.trim() })
        piece = ''
      }
      piece += (piece ? '\n\n' : '') + p
      while (piece.length > CHUNK_MAX_CHARS) {
        chunks.push({ headingPath: currentPath(), text: piece.slice(0, CHUNK_MAX_CHARS).trim() })
        piece = piece.slice(CHUNK_MAX_CHARS)
      }
    }
    if (piece.trim()) chunks.push({ headingPath: currentPath(), text: piece.trim() })
  }

  for (const line of lines) {
    const headingMatch = /^(#{1,6})\s+(.*)$/.exec(line)
    if (headingMatch) {
      flush()
      const level = headingMatch[1].length
      headingStack.length = level // trunca níveis mais fundos que o atual
      headingStack[level - 1] = headingMatch[2].trim()
      continue
    }
    buffer.push(line)
  }
  flush()

  return chunks
}

/** Regenera TODOS os chunks de um documento (delete + re-chunk + re-embed). Chamar após save. */
export async function regenerateChunks(documentId: string): Promise<{ chunkCount: number }> {
  const { rows } = await pool.query(
    `SELECT id, tenant_id, client_id, raw_markdown FROM ${SCHEMA}.knowledge_documents WHERE id = $1`,
    [documentId],
  )
  const doc = rows[0]
  if (!doc) throw new Error('Documento não encontrado.')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query(`DELETE FROM ${SCHEMA}.knowledge_chunks WHERE document_id = $1`, [documentId])

    const rawChunks = chunkMarkdown(doc.raw_markdown)
    let idx = 0
    for (const rc of rawChunks) {
      const chunkText = rc.headingPath ? `${rc.headingPath}\n\n${rc.text}` : rc.text
      // Sequencial (não Promise.all) — evita rajada contra a API do Gemini num save de
      // documento grande; documentos são editados com pouca frequência, não é hot path.
      const embedding = await embedText(chunkText, doc.tenant_id)
      await client.query(
        `INSERT INTO ${SCHEMA}.knowledge_chunks
           (document_id, tenant_id, client_id, chunk_index, heading_path, chunk_text, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7::vector)`,
        [documentId, doc.tenant_id, doc.client_id, idx, rc.headingPath, chunkText, JSON.stringify(embedding)],
      )
      idx++
    }
    await client.query('COMMIT')
    return { chunkCount: rawChunks.length }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/** Existe pelo menos 1 documento ativo no escopo (tenant-wide ou do cliente)? Gate pra exibir a ferramenta ao bot. */
export async function hasKnowledgeBase(tenantId: string, clientId: string | null): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM ${SCHEMA}.knowledge_documents
      WHERE tenant_id = $1 AND is_active = true AND (client_id IS NULL OR client_id = $2)
      LIMIT 1`,
    [tenantId, clientId],
  )
  return rows.length > 0
}

export interface KnowledgeSearchResult {
  documentTitle: string
  headingPath: string | null
  text: string
  score: number
}

/**
 * Busca híbrida: similaridade vetorial (peso 0.7) + full-text ts_rank (peso 0.3, capado em 1).
 * Escopo sempre forçado no servidor — NUNCA o LLM decide tenant/cliente.
 */
export async function searchKnowledge(
  tenantId: string,
  clientId: string | null,
  query: string,
  topK = 5,
): Promise<KnowledgeSearchResult[]> {
  const queryEmbedding = await embedText(query, tenantId)
  const { rows } = await pool.query(
    `WITH scored AS (
       SELECT d.title, c.heading_path, c.chunk_text,
              1 - (c.embedding <=> $1::vector) AS vec_score,
              ts_rank(c.tsv, plainto_tsquery('portuguese', $2)) AS text_score
         FROM ${SCHEMA}.knowledge_chunks c
         JOIN ${SCHEMA}.knowledge_documents d ON d.id = c.document_id
        WHERE c.tenant_id = $3 AND d.is_active = true
          AND (c.client_id IS NULL OR c.client_id = $4)
     )
     SELECT title, heading_path, chunk_text,
            (vec_score * 0.7 + LEAST(text_score, 1) * 0.3) AS combined_score
       FROM scored
      ORDER BY combined_score DESC
      LIMIT $5`,
    [JSON.stringify(queryEmbedding), query, tenantId, clientId, topK],
  )
  return rows.map((r: any) => ({
    documentTitle: r.title,
    headingPath: r.heading_path,
    text: r.chunk_text,
    score: Number(r.combined_score),
  }))
}

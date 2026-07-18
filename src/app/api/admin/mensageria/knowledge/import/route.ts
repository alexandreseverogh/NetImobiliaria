import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { regenerateChunks } from '@/lib/mensageria/tools/knowledgeBase'
import { extractMarkdownFromFile } from '@/lib/mensageria/tools/documentImport'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB — política/FAQ real não deveria passar disso

/**
 * POST /api/admin/mensageria/knowledge/import — cria um documento a partir de um PDF/DOCX.
 * multipart/form-data: file (obrigatório), clientId (opcional), title (opcional — default = nome do arquivo).
 * Reaproveita o MESMO pipeline de chunk/embed de um documento digitado à mão.
 */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!file || !(file instanceof File)) return NextResponse.json({ error: 'Arquivo é obrigatório' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE) return NextResponse.json({ error: 'Arquivo maior que 10MB.' }, { status: 400 })

  const clientId = ((form?.get('clientId') as string) || '').trim() || null
  const titleOverride = ((form?.get('title') as string) || '').trim()

  let extracted
  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    extracted = await extractMarkdownFromFile(buffer, file.name)
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Falha ao extrair texto do arquivo.' }, { status: 400 })
  }
  if (!extracted.markdown.trim()) {
    return NextResponse.json(
      { error: 'Não foi possível extrair texto deste arquivo — pode ser um PDF escaneado (imagem, sem texto selecionável).' },
      { status: 400 },
    )
  }

  const title = titleOverride || file.name.replace(/\.(pdf|docx)$/i, '')

  const { rows } = await pool.query(
    `INSERT INTO mensageria.knowledge_documents (tenant_id, client_id, title, source_type, raw_markdown, original_filename)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [payload.tenantId, clientId, title, extracted.sourceType, extracted.markdown, file.name],
  )
  const documentId = rows[0].id

  try {
    const { chunkCount } = await regenerateChunks(documentId)
    return NextResponse.json({ id: documentId, title, rawMarkdown: extracted.markdown, clientId, chunkCount })
  } catch (err: any) {
    console.error('[api/mensageria/knowledge/import] falha ao gerar embeddings', err)
    return NextResponse.json(
      {
        id: documentId, title, rawMarkdown: extracted.markdown, clientId, chunkCount: 0,
        warning: 'Documento importado, mas falhou ao gerar os embeddings. Revise e salve novamente.',
      },
      { status: 207 },
    )
  }
}

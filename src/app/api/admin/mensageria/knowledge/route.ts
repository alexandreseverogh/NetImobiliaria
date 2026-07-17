import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { regenerateChunks } from '@/lib/mensageria/tools/knowledgeBase'

export const dynamic = 'force-dynamic'

/** GET /api/admin/mensageria/knowledge — lista documentos da base de conhecimento do tenant */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT d.id, d.client_id, c.name AS client_name, d.title, d.source_type, d.original_filename,
            d.is_active, d.updated_at,
            (SELECT count(*) FROM mensageria.knowledge_chunks k WHERE k.document_id = d.id) AS chunk_count
       FROM mensageria.knowledge_documents d
       LEFT JOIN public.clientes c ON c.uuid = d.client_id
      WHERE d.tenant_id = $1
      ORDER BY d.updated_at DESC`,
    [payload.tenantId],
  )
  return NextResponse.json({ documents: rows })
}

/** POST /api/admin/mensageria/knowledge — cria documento. Body: { title, rawMarkdown, clientId? } */
export async function POST(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const title: string = (body.title || '').trim()
  const rawMarkdown: string = (body.rawMarkdown || '').trim()
  const clientId: string | null = body.clientId || null
  if (!title) return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
  if (!rawMarkdown) return NextResponse.json({ error: 'Conteúdo é obrigatório' }, { status: 400 })

  const { rows } = await pool.query(
    `INSERT INTO mensageria.knowledge_documents (tenant_id, client_id, title, raw_markdown)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [payload.tenantId, clientId, title, rawMarkdown],
  )
  const documentId = rows[0].id

  try {
    const { chunkCount } = await regenerateChunks(documentId)
    return NextResponse.json({ id: documentId, chunkCount })
  } catch (err: any) {
    console.error('[api/mensageria/knowledge] falha ao gerar embeddings', err)
    return NextResponse.json(
      { id: documentId, chunkCount: 0, warning: 'Documento salvo, mas falhou ao gerar os embeddings. Tente salvar novamente.' },
      { status: 207 },
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { regenerateChunks } from '@/lib/mensageria/tools/knowledgeBase'

export const dynamic = 'force-dynamic'

/** GET /api/admin/mensageria/knowledge/[id] — detalhe do documento (pra edição) */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { id } = await params

  const { rows } = await pool.query(
    `SELECT id, client_id, title, source_type, raw_markdown, original_filename, is_active, updated_at
       FROM mensageria.knowledge_documents WHERE id = $1 AND tenant_id = $2`,
    [id, payload.tenantId],
  )
  if (rows.length === 0) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
  const r = rows[0]
  return NextResponse.json({
    document: {
      id: r.id, clientId: r.client_id, title: r.title, sourceType: r.source_type,
      rawMarkdown: r.raw_markdown, originalFilename: r.original_filename,
      isActive: r.is_active, updatedAt: r.updated_at,
    },
  })
}

/** PUT /api/admin/mensageria/knowledge/[id] — atualiza e REGENERA os chunks/embeddings */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { id } = await params

  const body = await request.json().catch(() => ({}))
  const title: string = (body.title ?? '').trim()
  const rawMarkdown: string = (body.rawMarkdown ?? '').trim()
  const clientId: string | null = body.clientId ?? null
  const isActive: boolean = body.isActive !== false
  if (!title) return NextResponse.json({ error: 'Título é obrigatório' }, { status: 400 })
  if (!rawMarkdown) return NextResponse.json({ error: 'Conteúdo é obrigatório' }, { status: 400 })

  const { rows } = await pool.query(
    `UPDATE mensageria.knowledge_documents
        SET title = $1, raw_markdown = $2, client_id = $3, is_active = $4, updated_at = now()
      WHERE id = $5 AND tenant_id = $6
      RETURNING id`,
    [title, rawMarkdown, clientId, isActive, id, payload.tenantId],
  )
  if (rows.length === 0) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

  try {
    const { chunkCount } = await regenerateChunks(id)
    return NextResponse.json({ id, chunkCount })
  } catch (err: any) {
    console.error('[api/mensageria/knowledge/:id] falha ao regenerar embeddings', err)
    return NextResponse.json(
      { id, chunkCount: 0, warning: 'Documento salvo, mas falhou ao regenerar os embeddings. Tente salvar novamente.' },
      { status: 207 },
    )
  }
}

/** DELETE /api/admin/mensageria/knowledge/[id] — chunks cascateiam via FK ON DELETE CASCADE */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { id } = await params

  const { rowCount } = await pool.query(
    `DELETE FROM mensageria.knowledge_documents WHERE id = $1 AND tenant_id = $2`,
    [id, payload.tenantId],
  )
  if (!rowCount) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })
  return NextResponse.json({ success: true })
}

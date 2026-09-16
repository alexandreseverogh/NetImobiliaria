import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/mensageria/knowledge/[id]/chunks — lista os trechos (chunks) já gerados de um
 * documento, pra depuração/visualização na UI (item 5 do pedido: ver o que o bot realmente
 * recupera, não só a contagem). Somente leitura — nunca expõe o vetor de embedding.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  const { id } = await params

  // Confirma que o documento pertence ao tenant ANTES de expor qualquer chunk dele.
  const { rows: docRows } = await pool.query(
    `SELECT id FROM mensageria.knowledge_documents WHERE id = $1 AND tenant_id = $2`,
    [id, payload.tenantId],
  )
  if (docRows.length === 0) return NextResponse.json({ error: 'Documento não encontrado' }, { status: 404 })

  const { rows } = await pool.query(
    `SELECT chunk_index, heading_path, chunk_text
       FROM mensageria.knowledge_chunks
      WHERE document_id = $1
      ORDER BY chunk_index`,
    [id],
  )
  return NextResponse.json({
    chunks: rows.map((r) => ({ chunkIndex: r.chunk_index, headingPath: r.heading_path, chunkText: r.chunk_text })),
  })
}

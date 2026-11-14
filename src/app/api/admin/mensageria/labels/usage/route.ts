import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/mensageria/labels/usage?id=... — quantas conversas do tenant usam a etiqueta.
 * Usado pela tela para avisar antes de excluir uma etiqueta em uso.
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const id = new URL(request.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS conversations
       FROM mensageria.conversation_labels cl
       JOIN mensageria.labels l ON l.id = cl.label_id
      WHERE cl.label_id = $1 AND l.tenant_id = $2`,
    [id, payload.tenantId],
  )
  return NextResponse.json({ conversations: rows[0]?.conversations ?? 0 })
}

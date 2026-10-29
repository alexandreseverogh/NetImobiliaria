import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/** POST /api/admin/mensageria/conversations/[id]/labels — anexa etiqueta. Body: { labelId } */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const labelId = body.labelId
  if (!labelId) return NextResponse.json({ error: 'labelId é obrigatório' }, { status: 400 })

  // Confere que a conversa pertence ao tenant do usuário.
  const { rows: conv } = await pool.query(
    `SELECT id, client_id FROM mensageria.conversations WHERE id = $1 AND tenant_id = $2`,
    [params.id, payload.tenantId],
  )
  if (!conv[0]) return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 })

  // Achado real: esta checagem nunca existiu — labelId de OUTRO tenant era aceito sem erro
  // (o INSERT só falharia depois, de forma obscura, por violar a FK de conversation_labels).
  // Além de pertencer ao tenant, a etiqueta precisa ser tenant-wide OU do MESMO cliente da
  // conversa — nunca anexa a etiqueta de um cliente diferente a essa conversa.
  const { rows: label } = await pool.query(
    `SELECT id FROM mensageria.labels WHERE id = $1 AND tenant_id = $2 AND (client_id IS NULL OR client_id = $3)`,
    [labelId, payload.tenantId, conv[0].client_id],
  )
  if (!label[0]) return NextResponse.json({ error: 'Etiqueta não encontrada' }, { status: 404 })

  await pool.query(
    `INSERT INTO mensageria.conversation_labels (conversation_id, label_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [params.id, labelId],
  )

  await pool.query(
    `INSERT INTO mensageria.conversation_events (conversation_id, event_type, actor_id, payload)
     VALUES ($1, 'labeled', $2, $3::jsonb)`,
    [params.id, payload.userId, JSON.stringify({ labelId, action: 'add' })],
  )

  return NextResponse.json({ success: true })
}

/** DELETE /api/admin/mensageria/conversations/[id]/labels?labelId=... — desanexa etiqueta */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const labelId = new URL(request.url).searchParams.get('labelId')
  if (!labelId) return NextResponse.json({ error: 'labelId é obrigatório' }, { status: 400 })

  await pool.query(
    `DELETE FROM mensageria.conversation_labels
      WHERE conversation_id = $1 AND label_id = $2
        AND conversation_id IN (SELECT id FROM mensageria.conversations WHERE tenant_id = $3)`,
    [params.id, labelId, payload.tenantId],
  )

  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/mensageria/clientes-search?q=texto
 * Busca em public.clientes (clientes cadastrados do tenant) por nome — usado no
 * combobox "Nome do Contato" da Nova Conversa Manual, para vincular a conversa a
 * um client_id existente sem obrigar cadastro prévio (ver PLANO_MENSAGERIA.md).
 * Somente leitura, no máx. 8 resultados.
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const q = new URL(request.url).searchParams.get('q')?.trim() || ''
  if (q.length < 2) return NextResponse.json({ clientes: [] })

  const { rows } = await pool.query(
    `SELECT uuid, nome, telefone, email
       FROM public.clientes
      WHERE tenant_id = $1 AND nome ILIKE $2
      ORDER BY nome
      LIMIT 8`,
    [payload.tenantId, `%${q}%`],
  )
  return NextResponse.json({
    clientes: rows.map((r) => ({ id: r.uuid, nome: r.nome, telefone: r.telefone, email: r.email })),
  })
}

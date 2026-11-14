import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/mensageria/clientes-list
 * Lista TODOS os clientes do tenant, em ordem alfabética, para o seletor de cliente da
 * configuração de inboxes. Diferente de /campanhas/clients, não filtra por tipo_cliente:
 * uma inbox por cliente depende só do cadastro do cliente no tenant, não do módulo de
 * Campanhas (conta_gerenciada só faz sentido quando Campanhas está contratada).
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT uuid, nome
       FROM public.clientes
      WHERE tenant_id = $1
      ORDER BY nome ASC
      LIMIT 500`,
    [payload.tenantId],
  )
  return NextResponse.json({ clientes: rows.map((r) => ({ id: r.uuid, nome: r.nome })) })
}

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/mensageria/users — lista usuários do tenant (id + nome),
 * para popular dropdowns de atribuição/membros de time. Somente leitura.
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { rows } = await pool.query(
    `SELECT DISTINCT u.id, u.nome
       FROM public.user_tenant_membership utm
       JOIN public.users u ON u.id = utm.user_id
      WHERE utm.tenant_id = $1 AND u.ativo = true
      ORDER BY u.nome`,
    [payload.tenantId],
  )
  return NextResponse.json({ users: rows })
}

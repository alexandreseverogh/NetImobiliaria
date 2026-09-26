import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'

/**
 * GET /api/admin/clientes/tem-segmento-negocio
 *
 * As telas de criar/editar cliente (/admin/clientes) só devem solicitar o segmento de
 * negócios do cliente quando o TENANT tem isso ativado (tenants.associa_segmento_negocio_
 * cliente, curado pelo Master em /admin/master/tenants) — nem todo tenant gerencia clientes
 * de mais de um segmento, então nem sempre faz sentido pedir. Mesmo padrão de
 * tem-modulo-campanhas/route.ts.
 */
export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request)
  const decoded = token ? await verifyToken(token) : null
  const tenantId = decoded?.tenantId

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 })
  }

  try {
    const { rows } = await pool.query(
      `SELECT associa_segmento_negocio_cliente FROM public.tenants WHERE id = $1::uuid`,
      [tenantId],
    )
    return NextResponse.json({ associaSegmento: rows[0]?.associa_segmento_negocio_cliente === true })
  } catch (error) {
    console.error('❌ Erro ao verificar associa_segmento_negocio_cliente:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

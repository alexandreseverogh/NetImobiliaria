import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'

/**
 * GET /api/admin/clientes/tem-marketing-digital
 *
 * A aba "Config. Meta" (pixel/page/instagram/website) só é oferecida ao finalizar criar/
 * editar cliente (/admin/clientes) quando o TENANT tem isso ativado (tenants.
 * marketing_digital, curado pelo Master em /admin/master/tenants) — critério explícito e
 * dedicado, não mais amarrado a "o tenant contratou o módulo de Campanhas" (substitui
 * GET /tem-modulo-campanhas, que foi removida por ficar sem nenhum outro consumidor).
 * Mesmo padrão de GET /tem-segmento-negocio.
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
      `SELECT marketing_digital FROM public.tenants WHERE id = $1::uuid`,
      [tenantId],
    )
    return NextResponse.json({ marketingDigital: rows[0]?.marketing_digital === true })
  } catch (error) {
    console.error('❌ Erro ao verificar marketing_digital:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

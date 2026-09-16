import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'

/**
 * GET /api/admin/clientes/tem-modulo-campanhas
 *
 * A tela de "Config. Meta" (pixel/page/instagram/website) só faz sentido pra um tenant que
 * contratou o módulo de Campanhas ("Gestão de Campanhas de Marketing Digital", slug
 * `trafego-pago`) — sem ele, a aba não deveria nem aparecer depois de criar/editar um cliente
 * (mesmo padrão de `hasCrmModule` em revenueAttributionService.ts, generalizado aqui pro
 * módulo de Campanhas).
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
      `SELECT 1
         FROM public.tenant_modules tm
         JOIN public.system_modules sm ON sm.id = tm.module_id
        WHERE tm.tenant_id = $1::uuid AND sm.slug = 'trafego-pago' AND tm.is_enabled = true
        LIMIT 1`,
      [tenantId],
    )
    return NextResponse.json({ hasModule: rows.length > 0 })
  } catch (error) {
    console.error('❌ Erro ao verificar módulo Campanhas:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

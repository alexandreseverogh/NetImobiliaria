import { NextRequest, NextResponse } from 'next/server'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import pool from '@/lib/database/connection'
import { resolveMensageriaScope, isTenantAdminFromPayload } from '@/lib/mensageria/visibilityScope'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/mensageria/my-scope
 * Expõe o nível de visibilidade do usuário logado (PLANO_MENSAGERIA.md seção 16/17.4 —
 * Opção B). Usado por MensageriaLayoutContent para decidir se injeta "Painel do Gestor"
 * no menu — a sidebar genérica da plataforma nunca precisa saber que esse conceito existe.
 */
export async function GET(request: NextRequest) {
  const payload = getTokenPayload(request)
  if (!payload?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const scope = await resolveMensageriaScope(payload.tenantId, payload.userId, isTenantAdminFromPayload(payload))
  // visibleTeamCount: quantos times este usuário enxerga. Admin enxerga todos os do tenant;
  // líder/atendente, só os que integra. Usado para mostrar o nome do time no card apenas
  // quando há mais de um time — com um time só, o rótulo seria redundante.
  let visibleTeamCount: number
  if (scope.level === 'full') {
    const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM mensageria.teams WHERE tenant_id = $1`, [payload.tenantId])
    visibleTeamCount = rows[0]?.n ?? 0
  } else {
    visibleTeamCount = scope.teamIds.length
  }
  return NextResponse.json({ level: scope.level, visibleTeamCount })
}

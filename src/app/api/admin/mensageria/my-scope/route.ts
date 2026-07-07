import { NextRequest, NextResponse } from 'next/server'
import { getTokenPayload } from '@/lib/auth/jwt-node'
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
  return NextResponse.json({ level: scope.level })
}

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'

/**
 * Guarda comum das rotas do painel de debug (/api/admin/master/crm-agentes-debug/*) — mesmo
 * padrão de checagem já usado em /api/admin/master/tenants/route.ts. Master-only, sem exceção:
 * este painel toca WhatsApp real e gravação direta em crm_agent_actions, nunca deveria ser
 * alcançável por um tenant comum.
 */
export async function requireMaster(request: NextRequest): Promise<NextResponse | null> {
  const cookieToken = request.cookies.get('admin_auth_token')?.value
  const headerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const token = cookieToken || headerToken
  const decoded = token ? await verifyToken(token) : null
  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 })
  }
  return null
}

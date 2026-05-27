/**
 * ============================================================
 * Helper: Extrai tenant_id e informações do usuário do token JWT
 * ============================================================
 * Usado pelas APIs de logs para aplicar isolamento multi-tenant.
 *
 * Regra:
 *   - Admin de empresa → retorna tenantId do token
 *   - Master Admin (is_system_role=true) → retorna null (vê tudo)
 * ============================================================
 */

import { NextRequest } from 'next/server'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

export interface TokenContext {
  userId: string
  tenantId: string | null
  isMaster: boolean
  roleLevel: number
}

/**
 * Extrai o contexto do token JWT da requisição.
 * Retorna null se o token for inválido ou ausente.
 */
export async function getTokenContext(request: NextRequest): Promise<TokenContext | null> {
  try {
    const token =
      request.cookies.get('admin_auth_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return null

    const payload = await verifyTokenNode(token) as any

    return {
      userId: payload.userId ?? null,
      tenantId: payload.tenantId ?? null,
      isMaster: payload.is_system_role === true,
      roleLevel: payload.role_level ?? 1,
    }
  } catch {
    return null
  }
}

/**
 * Retorna o tenant_id para filtrar queries de log.
 *
 * - Master Admin → null (sem filtro, vê todos os tenants)
 * - Admin de empresa → string UUID do tenant
 *
 * @example
 * const tenantId = await getTenantFilterFromRequest(request)
 * // Se tenantId !== null: WHERE tenant_id = $1
 * // Se tenantId === null (master): sem filtro de tenant
 */
export async function getTenantFilterFromRequest(
  request: NextRequest
): Promise<string | null | undefined> {
  const ctx = await getTokenContext(request)

  if (!ctx) return undefined // token inválido → middleware deve ter bloqueado

  // Master vê tudo — sem filtro de tenant
  if (ctx.isMaster) return null

  // Admin de empresa — filtra pelo tenant
  return ctx.tenantId
}

/**
 * Retorna o contexto completo do tenant (filtros e metadados).
 */
export async function getTenantContext(request: NextRequest) {
  const ctx = await getTokenContext(request)
  if (!ctx) return { tenantId: undefined, isMaster: false, userId: null as string | null }
  return {
    tenantId: ctx.isMaster ? null : ctx.tenantId,
    isMaster: ctx.isMaster,
    userId: ctx.userId
  }
}

/**
 * Constrói a cláusula SQL de filtro de tenant para SELECTs.
 *
 * @returns { clause: string, params: any[], nextIndex: number }
 *
 * @example
 * const { clause, params, nextIndex } = buildTenantFilter(tenantId, 'al', 1)
 * // clause = "AND al.tenant_id = $1"
 * // params = [tenantId]
 */
export function buildTenantWhereClause(
  tenantId: string | null,
  tableAlias: string = '',
  startIndex: number = 1
): { clause: string; params: any[]; nextIndex: number } {
  const prefix = tableAlias ? `${tableAlias}.` : ''

  if (tenantId === null) {
    // Master: sem filtro
    return { clause: '', params: [], nextIndex: startIndex }
  }

  return {
    clause: `AND ${prefix}tenant_id = $${startIndex}`,
    params: [tenantId],
    nextIndex: startIndex + 1,
  }
}

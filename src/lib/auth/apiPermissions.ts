/**
 * ============================================================
 * API PERMISSION GUARD — Enforcement Server-Side
 * ============================================================
 * Verifica permissões diretamente no JWT em rotas de API.
 *
 * Por que JWT e não DB?
 *   O JWT é recalculado a cada login com a lógica de 3 níveis:
 *   1. System Admin  → ADMIN em tudo
 *   2. Tenant Admin  → ADMIN nas features provisionadas
 *   3. Usuário comum → permissões explícitas do role
 *
 * Uso em rotas de API:
 *   const denied = await requireApiPermission(request, 'clientes', 'CREATE')
 *   if (denied) return denied
 *   // ... lógica normal da rota
 * ============================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from './jwt'

export type ApiPermissionAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'EXECUTE' | 'ADMIN'

const PERMISSION_LEVELS: Record<ApiPermissionAction, number> = {
  READ:    1,
  EXECUTE: 2,
  CREATE:  3,
  UPDATE:  4,
  DELETE:  5,
  ADMIN:   6,
}

/**
 * Verifica se a requisição possui a permissão exigida.
 *
 * @returns `null`           — usuário autorizado, continue a rota
 * @returns `NextResponse`   — 401 ou 403, retorne imediatamente
 *
 * @example
 *   const denied = await requireApiPermission(request, 'clientes', 'DELETE')
 *   if (denied) return denied
 */
export async function requireApiPermission(
  request: NextRequest,
  resource: string,
  action: ApiPermissionAction,
): Promise<NextResponse | null> {
  const token = getTokenFromRequest(request)

  if (!token) {
    return NextResponse.json(
      { error: 'Não autenticado' },
      { status: 401 },
    )
  }

  const decoded = await verifyToken(token)

  if (!decoded) {
    return NextResponse.json(
      { error: 'Token inválido ou expirado' },
      { status: 401 },
    )
  }

  // ── Nível 1: System Admin tem passe global ──────────────────
  if (decoded.is_system_role === true) {
    return null
  }

  // ── Níveis 2 e 3: checar mapa de permissões do JWT ─────────
  const permissoes = (decoded.permissoes || {}) as Record<string, string>
  const userPermission = permissoes[resource] as ApiPermissionAction | undefined

  if (!userPermission) {
    return NextResponse.json(
      {
        error: 'Acesso negado',
        detail: `Sem permissão para "${action}" em "${resource}"`,
      },
      { status: 403 },
    )
  }

  const userLevel     = PERMISSION_LEVELS[userPermission] ?? 0
  const requiredLevel = PERMISSION_LEVELS[action]

  if (userLevel < requiredLevel) {
    return NextResponse.json(
      {
        error: 'Permissão insuficiente',
        detail: `Ação "${action}" requer nível ${requiredLevel}, usuário possui "${userPermission}" (nível ${userLevel})`,
      },
      { status: 403 },
    )
  }

  return null // ✅ autorizado
}

/**
 * Versão síncrona para quando o token já está decodificado.
 * Útil quando a rota já chamou verifyToken para outras verificações.
 *
 * @example
 *   const decoded = await verifyToken(token)
 *   if (!checkDecodedPermission(decoded, 'clientes', 'UPDATE')) {
 *     return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
 *   }
 */
export function checkDecodedPermission(
  decoded: { is_system_role?: boolean; permissoes?: Record<string, string> } | null,
  resource: string,
  action: ApiPermissionAction,
): boolean {
  if (!decoded) return false
  if (decoded.is_system_role === true) return true

  const permissoes = decoded.permissoes || {}
  const userPermission = permissoes[resource] as ApiPermissionAction | undefined

  if (!userPermission) return false

  const userLevel     = PERMISSION_LEVELS[userPermission] ?? 0
  const requiredLevel = PERMISSION_LEVELS[action]

  return userLevel >= requiredLevel
}

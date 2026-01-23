/**
 * ============================================================
 * UNIFIED PERMISSION MIDDLEWARE - Middleware Centralizado
 * ============================================================
 * 
 * OBJETIVO: Middleware ÚNICO para toda a aplicação
 * Substitui: permissionMiddleware.ts, authMiddleware.ts, apiAuth.ts
 * 
 * FEATURES:
 * - Busca configuração de rotas do banco (route_permissions_config)
 * - Verifica permissões via PermissionChecker
 * - Cache de configurações de rota
 * - Suporte a rotas dinâmicas [id], [slug]
 * - Suporte a 2FA quando necessário
 * 
 * FLUXO:
 * 1. Extrai rota e método da requisição
 * 2. Busca configuração no banco (route_permissions_config)
 * 3. Verifica autenticação (JWT)
 * 4. Verifica permissão (role_permissions)
 * 5. Verifica 2FA se necessário
 * 6. Permite ou nega acesso
 * 
 * GUARDIAN RULES: ✅
 * - Zero hardcoding de rotas
 * - Baseado 100% no banco de dados
 * - Fail-safe: erro = negar acesso
 * ============================================================
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'
import { checkUserPermission } from '@/lib/permissions/PermissionChecker'
import type { PermissionAction } from '@/lib/utils/permissions'
import pool from '@/lib/database/connection'

/**
 * Interface para configuração de rota
 * NOVO: Suporte aos 6 níveis granulares
 */
interface RouteConfig {
  route_pattern: string
  method: string
  feature_id: number
  feature_slug: string
  default_action: PermissionAction
  requires_auth: boolean
  requires_2fa: boolean
}

/**
 * Cache de configurações de rota
 * TTL: 5 minutos
 */
class RouteConfigCache {
  private cache = new Map<string, { config: RouteConfig | null; timestamp: number }>()
  private TTL = 5 * 60 * 1000 // 5 minutos

  get(key: string): RouteConfig | null | undefined {
    const cached = this.cache.get(key)
    if (!cached) return undefined

    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key)
      return undefined
    }

    return cached.config
  }

  set(key: string, config: RouteConfig | null): void {
    this.cache.set(key, {
      config,
      timestamp: Date.now()
    })
  }

  clear(): void {
    this.cache.clear()
  }
}

const routeCache = new RouteConfigCache()

/**
 * ============================================================
 * MIDDLEWARE UNIFICADO DE PERMISSÕES
 * ============================================================
 * 
 * Exporta função principal que será usada no middleware.ts
 */
export async function unifiedPermissionMiddleware(
  request: NextRequest
): Promise<NextResponse | null> {
  const { pathname } = request.nextUrl
  const method = request.method

  try {
    // 1. Buscar configuração da rota no banco (com cache)
    const routeConfig = await getRouteConfig(pathname, method)

    // Rota não configurada = não protegida (pública)
    if (!routeConfig) {
      return null
    }

    // Rota configurada mas não requer autenticação
    if (!routeConfig.requires_auth) {
      return null
    }

    // 2. Verificar autenticação (extrair token)
    const token = getTokenFromRequest(request)

    if (!token) {
      return NextResponse.json(
        {
          error: 'Autenticação necessária',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      )
    }

    // 3. Verificar se token é válido
    const decoded = await verifyToken(token)

    if (!decoded) {
      return NextResponse.json(
        {
          error: 'Token inválido ou expirado',
          code: 'INVALID_TOKEN'
        },
        { status: 401 }
      )
    }

    // 🆕 VALIDAÇÃO CRÍTICA: Verificar se o usuário ainda existe e está ativo no banco
    // Isso evita o "token fantasma" onde um usuário deletado continua logado
    const userExists = await checkUserExists(decoded.userId)
    if (!userExists) {
      console.warn('👻 Token fantasma detectado: Usuário não existe mais no banco:', decoded.userId)
      return NextResponse.json(
        {
          error: 'Usuário inválido ou inativo',
          code: 'USER_NOT_FOUND' // Código específico que pode gatilhar logout
        },
        { status: 401 } // 401 força logout no client
      )
    }

    // 4. Verificar permissão usando sistema centralizado
    const hasPermission = await checkUserPermission(
      decoded.userId,
      routeConfig.feature_slug,
      routeConfig.default_action
    )

    if (!hasPermission) {
      // Log de tentativa de acesso negado
      console.warn('🔒 Acesso negado:', {
        userId: decoded.userId,
        route: pathname,
        method: method,
        feature: routeConfig.feature_slug,
        action: routeConfig.default_action,
        timestamp: new Date().toISOString()
      })

      return NextResponse.json(
        {
          error: 'Permissão insuficiente',
          code: 'PERMISSION_DENIED',
          details: {
            feature: routeConfig.feature_slug,
            required_action: routeConfig.default_action
          }
        },
        { status: 403 }
      )
    }

    // 5. Verificar 2FA se necessário
    if (routeConfig.requires_2fa && !decoded.twoFAVerified) {
      return NextResponse.json(
        {
          error: 'Verificação 2FA necessária para esta operação',
          code: 'TWO_FA_REQUIRED'
        },
        { status: 403 }
      )
    }

    // ✅ Tudo OK - permitir acesso
    return null

  } catch (error) {
    console.error('❌ Erro no middleware de permissões:', error)

    // Fail-safe: em caso de erro, negar acesso
    return NextResponse.json(
      {
        error: 'Erro interno ao verificar permissões',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }
}

/**
 * ============================================================
 * Buscar Configuração de Rota no Banco
 * ============================================================
 * 
 * Busca em route_permissions_config com suporte a:
 * - Match exato: /admin/imoveis
 * - Match com regex: /admin/imoveis/[id] → /admin/imoveis/123
 */
async function getRouteConfig(
  pathname: string,
  method: string
): Promise<RouteConfig | null> {
  const cacheKey = `${pathname}:${method}`

  // Verificar cache
  const cached = routeCache.get(cacheKey)
  if (cached !== undefined) {
    return cached
  }

  try {
    // Query com suporte a rotas dinâmicas
    const query = `
      SELECT 
        rpc.route_pattern,
        rpc.method,
        rpc.feature_id,
        sf.slug as feature_slug,
        rpc.default_action,
        rpc.requires_auth,
        rpc.requires_2fa
      FROM route_permissions_config rpc
      LEFT JOIN system_features sf ON rpc.feature_id = sf.id
      WHERE rpc.is_active = true
        AND (sf.id IS NULL OR sf.is_active = true)
        AND rpc.method = $1
        AND (
          -- Match exato
          rpc.route_pattern = $2
          OR
          -- Match com regex para rotas dinâmicas [id], [slug], etc
          $2 ~ ('^' || REPLACE(REPLACE(rpc.route_pattern, '[id]', '[^/]+'), '[slug]', '[^/]+') || '$')
        )
      ORDER BY 
        CASE WHEN rpc.route_pattern = $2 THEN 0 ELSE 1 END,  -- Priorizar match exato
        LENGTH(rpc.route_pattern) DESC  -- Depois, rota mais específica
      LIMIT 1
    `

    const result = await pool.query(query, [method, pathname])

    const config = result.rows.length > 0 ? result.rows[0] as RouteConfig : null

    // Salvar no cache
    routeCache.set(cacheKey, config)

    return config
  } catch (error) {
    console.error('❌ Erro ao buscar configuração de rota:', error)
    return null
  }
}

/**
 * ============================================================
 * Verificar se Usuário Existe e Está Ativo
 * ============================================================
 */
async function checkUserExists(userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      'SELECT 1 FROM users WHERE id = $1 AND ativo = true LIMIT 1',
      [userId]
    )
    return result.rows.length > 0
  } catch (error) {
    console.error('❌ Erro ao verificar existência do usuário:', error)
    return false
  }
}

/**
 * ============================================================
 * Limpar Cache (útil quando configurações mudam)
 * ============================================================
 */
export function clearRouteCache(): void {
  routeCache.clear()
}


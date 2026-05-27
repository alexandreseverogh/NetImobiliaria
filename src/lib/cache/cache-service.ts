/**
 * ============================================================
 * Cache Service — Camada de Cache com Redis
 * ============================================================
 * Abstrai o Redis com TTLs pré-definidos por tipo de dado.
 * Fallback automático para banco se Redis não estiver disponível.
 *
 * TTLs:
 *   Usuário:      5 min  — dados que mudam raramente
 *   Permissões:   30 min — reload forçado no login/logout
 *   Imóveis:      10 min — dados de listagem pública
 *   Sessões:      TTL do JWT
 * ============================================================
 */

import { getRedisClient } from './redis-client'

// TTLs em segundos
const TTL = {
  USER: 300,           // 5 min
  PERMISSIONS: 1800,   // 30 min
  IMOVEIS: 600,        // 10 min
  IMOVEL: 300,         // 5 min (item individual)
  SESSION: 900,        // 15 min
  RATE_LIMIT: 300,     // 5 min
} as const

// ============================================================
// Helpers internos
// ============================================================

async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient()
  if (!redis) return null

  try {
    const value = await redis.get(key)
    if (!value) return null
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

async function cacheSet(key: string, value: unknown, ttl: number): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  try {
    await redis.setex(key, ttl, JSON.stringify(value))
  } catch {
    // Silencioso — cache é best-effort
  }
}

async function cacheDel(...keys: string[]): Promise<void> {
  const redis = getRedisClient()
  if (!redis || keys.length === 0) return

  try {
    await redis.del(...keys)
  } catch {
    // Silencioso
  }
}

async function cacheDelPattern(pattern: string): Promise<void> {
  const redis = getRedisClient()
  if (!redis) return

  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch {
    // Silencioso
  }
}

// ============================================================
// Cache de Usuários
// ============================================================

export async function getCachedUser<T>(userId: string): Promise<T | null> {
  return cacheGet<T>(`user:${userId}`)
}

export async function setCachedUser(userId: string, userData: unknown): Promise<void> {
  await cacheSet(`user:${userId}`, userData, TTL.USER)
}

export async function invalidateUser(userId: string): Promise<void> {
  await cacheDel(`user:${userId}`, `permissions:${userId}`)
}

// ============================================================
// Cache de Permissões
// ============================================================

export async function getCachedPermissions<T>(userId: string): Promise<T | null> {
  return cacheGet<T>(`permissions:${userId}`)
}

export async function setCachedPermissions(userId: string, permissions: unknown): Promise<void> {
  await cacheSet(`permissions:${userId}`, permissions, TTL.PERMISSIONS)
}

export async function invalidatePermissions(userId: string): Promise<void> {
  await cacheDel(`permissions:${userId}`)
}

// ============================================================
// Cache de Imóveis (listagens públicas)
// ============================================================

export function buildImoveisKey(filters: Record<string, unknown>): string {
  // Chave estável e determinística baseada nos filtros
  const sorted = Object.keys(filters)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = filters[k]
      return acc
    }, {})
  return `imoveis:list:${JSON.stringify(sorted)}`
}

export async function getCachedImoveis<T>(filters: Record<string, unknown>): Promise<T | null> {
  return cacheGet<T>(buildImoveisKey(filters))
}

export async function setCachedImoveis(filters: Record<string, unknown>, data: unknown): Promise<void> {
  await cacheSet(buildImoveisKey(filters), data, TTL.IMOVEIS)
}

export async function getCachedImovel<T>(imovelId: number): Promise<T | null> {
  return cacheGet<T>(`imovel:${imovelId}`)
}

export async function setCachedImovel(imovelId: number, data: unknown): Promise<void> {
  await cacheSet(`imovel:${imovelId}`, data, TTL.IMOVEL)
}

/** Invalida TODO o cache de imóveis (ex: após criar/editar/deletar) */
export async function invalidateImoveis(imovelId?: number): Promise<void> {
  await cacheDelPattern('imoveis:list:*')
  if (imovelId) {
    await cacheDel(`imovel:${imovelId}`)
  }
}

// ============================================================
// Utilitário genérico — withCache
// ============================================================

/**
 * Envolve qualquer função com cache automático.
 * Se Redis não estiver disponível, executa direto sem cache.
 *
 * @example
 * const imoveis = await withCache('imoveis:all', 600, () => db.getImoveis())
 */
export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await cacheGet<T>(key)
  if (cached !== null) return cached

  const data = await fetcher()
  await cacheSet(key, data, ttl)
  return data
}

// ============================================================
// Diagnóstico
// ============================================================

export async function getCacheStats(): Promise<{
  available: boolean
  status: string
  info?: string
}> {
  const redis = getRedisClient()
  if (!redis) {
    return { available: false, status: 'not_configured' }
  }

  try {
    const info = await redis.info('server')
    return {
      available: true,
      status: redis.status,
      info: info.split('\n').find(l => l.startsWith('redis_version')) || undefined,
    }
  } catch (err) {
    return { available: false, status: 'error' }
  }
}

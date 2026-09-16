/**
 * ============================================================
 * Rate Limiter — Redis-based com fallback in-memory
 * ============================================================
 * Usa `rate-limiter-flexible` (já instalado no projeto).
 * Se Redis não estiver disponível, usa memória local (fallback).
 *
 * Limites por endpoint:
 *   login:      5 tentativas / 10 min (bloqueio progressivo)
 *   api:        300 req / 1 min por IP
 *   upload:     20 uploads / 1 hora por usuário
 *   admin:      1000 req / 1 min por usuário
 *   public:     100 req / 1 min por IP
 * ============================================================
 */

import {
  RateLimiterRedis,
  RateLimiterMemory,
  RateLimiterRes,
  IRateLimiterOptions,
} from 'rate-limiter-flexible'
import { getRedisClient } from '@/lib/cache/redis-client'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Fábrica de limitadores (Redis ou Memory como fallback)
// ============================================================

function createLimiter(options: IRateLimiterOptions) {
  const redis = getRedisClient()
  if (redis) {
    return new RateLimiterRedis({ storeClient: redis, ...options })
  }
  // Fallback in-memory para dev local (sem Redis)
  return new RateLimiterMemory(options)
}

// ============================================================
// Limitadores pré-configurados por tipo de rota
// ============================================================

// 5 tentativas por 10 minutos (login)
export const loginLimiter = createLimiter({
  keyPrefix: 'rl:login',
  points: 5,
  duration: 10 * 60,
  blockDuration: 15 * 60, // bloqueia 15 min após esgotar
})

// 300 requisições por minuto (APIs gerais por IP)
export const apiLimiter = createLimiter({
  keyPrefix: 'rl:api',
  points: 300,
  duration: 60,
})

// 20 uploads por hora por usuário
export const uploadLimiter = createLimiter({
  keyPrefix: 'rl:upload',
  points: 20,
  duration: 60 * 60,
})

// 1000 req/min para rotas admin autenticadas
export const adminLimiter = createLimiter({
  keyPrefix: 'rl:admin',
  points: 1000,
  duration: 60,
})

// 100 req/min para rotas públicas
export const publicLimiter = createLimiter({
  keyPrefix: 'rl:public',
  points: 100,
  duration: 60,
})

// 15 mensagens/min por sessão do widget de chat público (M4.4) — bem mais restrito que o
// publicLimiter genérico porque cada mensagem dispara uma chamada real ao LLM (custo real,
// endpoint sem autenticação — qualquer visitante da internet pode chamar).
export const webchatLimiter = createLimiter({
  keyPrefix: 'rl:webchat',
  points: 15,
  duration: 60,
})

// ============================================================
// Extrator de identificador do cliente
// ============================================================

export function getClientId(request: NextRequest): string {
  // Respeita headers de proxy reverso (Caddy/Nginx na VPS)
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const ip = forwarded?.split(',')[0].trim() || realIp || 'unknown'
  return ip
}

// ============================================================
// Middleware helper reutilizável
// ============================================================

interface RateLimitResult {
  blocked: boolean
  response?: NextResponse
  remainingPoints?: number
  msBeforeNext?: number
}

export async function checkRateLimit(
  limiter: RateLimiterRedis | RateLimiterMemory,
  key: string
): Promise<RateLimitResult> {
  try {
    const result = await limiter.consume(key)
    return {
      blocked: false,
      remainingPoints: result.remainingPoints,
      msBeforeNext: result.msBeforeNext,
    }
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      const retryAfter = Math.ceil(err.msBeforeNext / 1000)
      return {
        blocked: true,
        response: NextResponse.json(
          {
            error: 'Muitas requisições. Tente novamente em breve.',
            retryAfterSeconds: retryAfter,
          },
          {
            status: 429,
            headers: {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(Date.now() + err.msBeforeNext).toISOString(),
            },
          }
        ),
      }
    }
    // Erro inesperado no limiter — fail open (não bloqueia)
    console.error('⚠️ [RateLimit] Erro inesperado (fail open):', err)
    return { blocked: false }
  }
}

// ============================================================
// Helpers para uso direto nas rotas
// ============================================================

/**
 * Aplica rate limit de login. Retorna NextResponse 429 se bloqueado.
 * @example
 *   const blocked = await applyLoginRateLimit(request)
 *   if (blocked) return blocked
 */
export async function applyLoginRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const ip = getClientId(request)
  const { blocked, response } = await checkRateLimit(loginLimiter, `login:${ip}`)
  return blocked ? response! : null
}

/**
 * Aplica rate limit para APIs públicas.
 */
export async function applyPublicRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const ip = getClientId(request)
  const { blocked, response } = await checkRateLimit(publicLimiter, `public:${ip}`)
  return blocked ? response! : null
}

/**
 * Aplica rate limit ao widget de chat público (M4.4) — chave dupla (sessão + IP), o que vier
 * primeiro bloqueia: impede tanto 1 visitante martelando o bot quanto 1 IP abrindo várias
 * sessões novas pra contornar o limite por sessão.
 */
export async function applyWebchatRateLimit(
  request: NextRequest,
  sessionId: string,
): Promise<NextResponse | null> {
  const bySession = await checkRateLimit(webchatLimiter, `webchat:session:${sessionId}`)
  if (bySession.blocked) return bySession.response!
  const byIp = await checkRateLimit(webchatLimiter, `webchat:ip:${getClientId(request)}`)
  if (byIp.blocked) return byIp.response!
  return null
}

/**
 * Aplica rate limit para uploads (por usuário autenticado ou IP).
 */
export async function applyUploadRateLimit(
  request: NextRequest,
  userId?: string
): Promise<NextResponse | null> {
  const key = userId ? `upload:user:${userId}` : `upload:ip:${getClientId(request)}`
  const { blocked, response } = await checkRateLimit(uploadLimiter, key)
  return blocked ? response! : null
}

/**
 * Aplica rate limit para rotas admin.
 */
export async function applyAdminRateLimit(
  request: NextRequest,
  userId?: string
): Promise<NextResponse | null> {
  const key = userId ? `admin:user:${userId}` : `admin:ip:${getClientId(request)}`
  const { blocked, response } = await checkRateLimit(adminLimiter, key)
  return blocked ? response! : null
}

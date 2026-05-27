// Implementação JWT compatível com Node.js para middleware
import { AUTH_CONFIG } from '@/lib/config/auth'
import jwt from 'jsonwebtoken'
import type { NextRequest } from 'next/server'

// Configurações JWT
const JWT_SECRET = AUTH_CONFIG.JWT.SECRET

// Interface para o payload do token
export interface JWTPayload {
  userId: string
  username: string
  cargo: string // Mantido para retrocompatibilidade
  role_name?: string
  role_level?: number
  is_system_role?: boolean
  iat?: number
  exp?: number
}

// Gerar token de acesso (versão Node.js)
export function generateAccessTokenNode(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  customExpiresIn?: number // Tempo de expiração customizado em segundos
): string {
  // 24 horas em segundos (padrão) ou valor customizado
  const expiresIn = customExpiresIn || 24 * 60 * 60

  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn
  })
}

// Gerar refresh token (versão Node.js)
export function generateRefreshTokenNode(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  // 7 dias em segundos
  const expiresIn = 7 * 24 * 60 * 60

  return jwt.sign(payload, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn
  })
}

// Gerar ambos os tokens (versão Node.js)
export function generateTokensNode(payload: Omit<JWTPayload, 'iat' | 'exp'>): {
  accessToken: string
  refreshToken: string
} {
  return {
    accessToken: generateAccessTokenNode(payload),
    refreshToken: generateRefreshTokenNode(payload)
  }
}

// Verificar e decodificar token (versão Node.js)
export function verifyTokenNode(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] })
    return decoded as JWTPayload
  } catch (error) {
    console.error('Erro ao verificar token (Node.js/jsonwebtoken):', error)
    return null
  }
}

/**
 * Extrai o payload completo do JWT a partir de cookies (admin_auth_token)
 * ou do header Authorization: Bearer <token>.
 * Usado pelas API routes de campanhas.
 */
export function getTokenPayload(request: NextRequest): (JWTPayload & { tenantId?: string; tenantSlug?: string; nome?: string; email?: string; permissoes?: Record<string, string> }) | null {
  try {
    const cookie = request.cookies.get('admin_auth_token')
    if (cookie?.value) return verifyTokenNode(cookie.value) as any

    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      return verifyTokenNode(token) as any
    }

    return null
  } catch {
    return null
  }
}

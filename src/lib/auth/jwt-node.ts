// Implementação JWT compatível com Node.js para middleware
import { AUTH_CONFIG } from '@/lib/config/auth'
import jwt from 'jsonwebtoken'

// Configurações JWT
const JWT_SECRET = AUTH_CONFIG.JWT.SECRET

// Interface para o payload do token
export interface JWTPayload {
  userId: string
  username: string
  cargo: string
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

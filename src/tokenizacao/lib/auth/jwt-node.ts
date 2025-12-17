// Implementação JWT compatível com Node.js para middleware
import { AUTH_CONFIG } from '@/lib/config/auth'
import crypto from 'crypto'

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
export function generateAccessTokenNode(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (24 * 60 * 60) // 24 horas
  
  const payloadWithTime = {
    ...payload,
    iat: now,
    exp
  }
  
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  const payloadB64 = Buffer.from(JSON.stringify(payloadWithTime)).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  const data = headerB64 + '.' + payloadB64
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  return data + '.' + signature
}

// Gerar refresh token (versão Node.js)
export function generateRefreshTokenNode(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (7 * 24 * 60 * 60) // 7 dias
  
  const payloadWithTime = {
    ...payload,
    iat: now,
    exp
  }
  
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  const payloadB64 = Buffer.from(JSON.stringify(payloadWithTime)).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  const data = headerB64 + '.' + payloadB64
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
  
  return data + '.' + signature
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
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const [headerB64, payloadB64, signatureB64] = parts
    
    // Verificar assinatura usando HMAC SHA256
    const data = headerB64 + '.' + payloadB64
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(data)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    
    if (signatureB64 !== expectedSignature) {
      return null
    }
    
    // Decodificar payload
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString())
    
    // Verificar expiração
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    
    return payload
  } catch (error) {
    console.error('Erro ao verificar token (Node.js):', error)
    return null
  }
}

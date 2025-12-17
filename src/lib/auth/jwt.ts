// Implementação JWT compatível com Edge Runtime usando Web Crypto API
import { AUTH_CONFIG } from '@/lib/config/auth'

// Configurações JWT
const JWT_SECRET = AUTH_CONFIG.JWT.SECRET
const JWT_EXPIRES_IN = AUTH_CONFIG.JWT.ACCESS_TOKEN_EXPIRES_IN
const JWT_REFRESH_EXPIRES_IN = AUTH_CONFIG.JWT.REFRESH_TOKEN_EXPIRES_IN

// Interface para o payload do token
export interface JWTPayload {
  userId: string
  username: string
  cargo: string
  role_name?: string
  sessionId?: string
  twoFAVerified?: boolean
  is2FAEnabled?: boolean
  userUuid?: string
  userType?: string
  nome?: string
  email?: string
  iat?: number
  exp?: number
}

// Interface para tokens
export interface Tokens {
  accessToken: string
  refreshToken: string
}

// Função auxiliar para converter string para ArrayBuffer
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder()
  return encoder.encode(str).buffer
}

// Função auxiliar para converter ArrayBuffer para string
function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder()
  return decoder.decode(buffer)
}

// Função auxiliar para converter ArrayBuffer para base64url
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

// Função auxiliar para converter base64url para ArrayBuffer
function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const base64Padded = base64 + padding
  const binary = atob(base64Padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

// Gerar token de acesso
export async function generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (parseInt(JWT_EXPIRES_IN) || 24 * 60 * 60) // 24 horas padrão
  
  const payloadWithTime = {
    ...payload,
    iat: now,
    exp
  }
  
  const headerB64 = arrayBufferToBase64Url(stringToArrayBuffer(JSON.stringify(header)))
  const payloadB64 = arrayBufferToBase64Url(stringToArrayBuffer(JSON.stringify(payloadWithTime)))
  
  const data = headerB64 + '.' + payloadB64
  const key = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, stringToArrayBuffer(data))
  const signatureB64 = arrayBufferToBase64Url(signature)
  
  return data + '.' + signatureB64
}

// Gerar refresh token
export async function generateRefreshToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (parseInt(JWT_REFRESH_EXPIRES_IN) || 7 * 24 * 60 * 60) // 7 dias padrão
  
  const payloadWithTime = {
    ...payload,
    iat: now,
    exp
  }
  
  const headerB64 = arrayBufferToBase64Url(stringToArrayBuffer(JSON.stringify(header)))
  const payloadB64 = arrayBufferToBase64Url(stringToArrayBuffer(JSON.stringify(payloadWithTime)))
  
  const data = headerB64 + '.' + payloadB64
  const key = await crypto.subtle.importKey(
    'raw',
    stringToArrayBuffer(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signature = await crypto.subtle.sign('HMAC', key, stringToArrayBuffer(data))
  const signatureB64 = arrayBufferToBase64Url(signature)
  
  return data + '.' + signatureB64
}

// Gerar ambos os tokens
export async function generateTokens(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<Tokens> {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(payload),
    generateRefreshToken(payload)
  ])
  
  return {
    accessToken,
    refreshToken
  }
}

// Verificar e decodificar token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const [headerB64, payloadB64, signatureB64] = parts
    
    // Verificar assinatura
    const data = headerB64 + '.' + payloadB64
    const key = await crypto.subtle.importKey(
      'raw',
      stringToArrayBuffer(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )
    
    const signature = base64UrlToArrayBuffer(signatureB64)
    const isValid = await crypto.subtle.verify('HMAC', key, signature, stringToArrayBuffer(data))
    
    if (!isValid) return null
    
    // Decodificar payload
    const payload = JSON.parse(arrayBufferToString(base64UrlToArrayBuffer(payloadB64)))
    
    // Verificar expiração
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null
    }
    
    return payload
  } catch (error) {
    console.error('Erro ao verificar token:', error)
    return null
  }
}

// Verificar se token está expirado
export async function isTokenExpired(token: string): Promise<boolean> {
  try {
    const decoded = await verifyToken(token)
    return !decoded
  } catch (error) {
    return true
  }
}

// Renovar token usando refresh token
export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  try {
    const decoded = await verifyToken(refreshToken)
    if (!decoded) return null
    
    const { userId, username, cargo } = decoded
    return await generateAccessToken({ userId, username, cargo })
  } catch (error) {
    console.error('Erro ao renovar token:', error)
    return null
  }
}


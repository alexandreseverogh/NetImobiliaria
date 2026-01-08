/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import { AUTH_CONFIG } from '@/lib/config/auth'

export function apiAuthMiddleware(request: NextRequest) {
  const token = request.cookies.get(AUTH_CONFIG.COOKIES.ACCESS_TOKEN_NAME)?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')
  
  if (!token) {
    return NextResponse.json(
      { error: 'Token de autenticaÃ§Ã£o nÃ£o fornecido' },
      { status: 401 }
    )
  }
  
  const decoded = verifyToken(token)
  if (!decoded) {
    return NextResponse.json(
      { error: 'Token de autenticaÃ§Ã£o invÃ¡lido ou expirado' },
      { status: 401 }
    )
  }
  
  return null // Continua com a requisiÃ§Ã£o
}



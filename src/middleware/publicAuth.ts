import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

/**
 * Middleware de autenticação para área pública
 * Verifica se o usuário (cliente ou proprietário) está autenticado
 */
export function publicAuthMiddleware(request: NextRequest) {
  try {
    // Verificar se há token no localStorage (através do header Authorization)
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.redirect(new URL('/landpaging?login=required', request.url))
    }

    const token = authHeader.substring(7)
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'

    // Validar token
    const decoded = jwt.verify(token, jwtSecret) as any

    if (!decoded || !decoded.userUuid || !decoded.userType) {
      return NextResponse.redirect(new URL('/landpaging?login=expired', request.url))
    }

    // Token válido - permitir acesso
    return NextResponse.next()

  } catch (error) {
    console.error('❌ Erro no middleware de autenticação pública:', error)
    return NextResponse.redirect(new URL('/landpaging?login=error', request.url))
  }
}



import { NextRequest, NextResponse } from 'next/server'
import { environmentMainMiddleware } from './src/middleware/environmentMiddleware'

// Middleware principal do Next.js
export function middleware(request: NextRequest) {
  // Aplicar middleware de ambiente
  return environmentMainMiddleware(request)
}

// Configuração do matcher para aplicar o middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
}



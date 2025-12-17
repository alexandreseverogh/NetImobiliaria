import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir todas as rotas de autenticação e API
  if (pathname === '/admin/login' || 
      pathname === '/api/admin/auth/login' || 
      pathname === '/api/admin/auth/me' ||
      pathname === '/api/admin/auth/logout') {
    return NextResponse.next()
  }

  // Para outras rotas administrativas, verificar token
  if (pathname.startsWith('/admin')) {
    const token = request.cookies.get('accessToken')?.value

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*']
}

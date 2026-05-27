import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const url = request.url

  // 1. Páginas Absolutamente Públicas
  const publicPages = [
    '/admin/login',
    '/admin/forgot-password',
    '/admin/reset-password',
    '/api/admin/auth/login'
  ]

  if (publicPages.some(page => pathname.startsWith(page))) {
    return NextResponse.next()
  }

    // 2. Definir se é rota protegida
    const isProtectedRoute = pathname.startsWith('/admin') || pathname.startsWith('/crm')
  
    if (isProtectedRoute) {
      // Compatibilidade Dual: Suporta tanto o padrão antigo quanto o novo
      const token = request.cookies.get('admin_auth_token')?.value || request.cookies.get('admin-auth-token')?.value
      
      const isValidToken = token && token.split('.').length === 3
      
      console.log(`[MIDDLEWARE] Acesso a: ${pathname} | Token presente: ${!!token}`)
 
     // Se não tem token OU o token parece inválido (formato básico JWT: x.y.z)
     if (!token || !isValidToken) {
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      
      console.log(`[MIDDLEWARE] Bloqueando acesso. Token inválido ou ausente. Redirecionando ${pathname} -> /admin/login`)
      
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('admin_auth_token')
      response.cookies.delete('admin-auth-token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|images).*)',
  ]
}
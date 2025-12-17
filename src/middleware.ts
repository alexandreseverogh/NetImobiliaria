import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Páginas que não precisam de verificação de permissão
  const publicPages = [
    '/admin/login',
    '/admin/forgot-password',
    '/admin/reset-password'
  ]
  
  // Se for uma página pública, apenas aplicar headers de segurança
  if (publicPages.includes(pathname)) {
    const response = NextResponse.next()
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'no-referrer-when-downgrade')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    return response
  }
  
  // Para outras páginas, aplicar headers e continuar
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'no-referrer-when-downgrade')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  return response
}

export const config = {
  matcher: [
    '/api/admin/:path*',
    '/admin/:path*'
  ]
}
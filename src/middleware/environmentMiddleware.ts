import { NextRequest, NextResponse } from 'next/server'
import { getEnvironmentConfig } from '../lib/config/development'

// Middleware para aplicar configurações baseadas no ambiente
export function environmentMiddleware(request: NextRequest) {
  const envConfig = getEnvironmentConfig()
  
  // Criar resposta
  const response = NextResponse.next()
  
  // Aplicar headers de segurança baseados no ambiente
  Object.entries(envConfig.SECURITY.SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value)
  })
  
  // Configurações específicas para desenvolvimento
  if (envConfig.ENVIRONMENT === 'development') {
    // Headers para desenvolvimento
    response.headers.set('X-Environment', 'development')
    response.headers.set('X-Debug-Enabled', 'true')
    
    // Logs de debug
    if (envConfig.DEBUG.ENABLED) {
      console.log(`🔧 [DEV] ${request.method} ${request.url}`)
    }
  }
  
  // Configurações específicas para produção
  if (envConfig.ENVIRONMENT === 'production') {
    // Headers para produção
    response.headers.set('X-Environment', 'production')
    response.headers.set('X-Debug-Enabled', 'false')
    
    // Remover headers de debug
    response.headers.delete('X-Environment')
    response.headers.delete('X-Debug-Enabled')
  }
  
  // Configurações de CORS baseadas no ambiente
  const origin = request.headers.get('origin')
  if (origin && envConfig.SECURITY.ALLOWED_ORIGINS.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }
  
  // Configurações de cache baseadas no ambiente
  if (envConfig.CACHE.ENABLED) {
    // Cache habilitado
    response.headers.set('Cache-Control', `public, max-age=${envConfig.CACHE.TTL / 1000}`)
  } else {
    // Cache desabilitado
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
  }
  
  return response
}

// Middleware para validação de ambiente
export function validateEnvironment(request: NextRequest) {
  const envConfig = getEnvironmentConfig()
  
  // Verificar se HTTPS é obrigatório em produção
  if (envConfig.SECURITY.FORCE_HTTPS && envConfig.ENVIRONMENT === 'production') {
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    if (protocol !== 'https') {
      return NextResponse.redirect(`https://${request.headers.get('host')}${request.nextUrl.pathname}`, 301)
    }
  }
  
  // Verificar origem permitida
  const origin = request.headers.get('origin')
  if (origin && envConfig.SECURITY.CORS_STRICT && !envConfig.SECURITY.ALLOWED_ORIGINS.includes(origin)) {
    return NextResponse.json({ error: 'Origin not allowed' }, { status: 403 })
  }
  
  return null
}

// Middleware para logging de desenvolvimento
export function developmentLogging(request: NextRequest) {
  const envConfig = getEnvironmentConfig()
  
  if (envConfig.ENVIRONMENT === 'development' && envConfig.DEBUG.ENABLED) {
    const startTime = Date.now()
    
    // Log da requisição
    console.log(`🔍 [DEV LOG] ${request.method} ${request.url}`)
    console.log(`   Headers:`, Object.fromEntries(request.headers.entries()))
    
    // Log de performance se habilitado
    if (envConfig.DEBUG.PERFORMANCE_LOGS) {
      const originalNext = NextResponse.next
      NextResponse.next = function(...args: Parameters<typeof originalNext>) {
        const endTime = Date.now()
        const duration = endTime - startTime
        console.log(`⏱️ [PERF] ${request.method} ${request.url} - ${duration}ms`)
        return originalNext.apply(this, args)
      }
    }
  }
  
  return null
}

// Middleware principal que combina todas as funcionalidades
export function environmentMainMiddleware(request: NextRequest) {
  // Validar ambiente
  const validationResponse = validateEnvironment(request)
  if (validationResponse) {
    return validationResponse
  }
  
  // Logging de desenvolvimento
  developmentLogging(request)
  
  // Aplicar configurações de ambiente
  return environmentMiddleware(request)
}



import { NextRequest, NextResponse } from 'next/server'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { getClientIP } from '@/lib/utils/ipUtils'
import { getGeolocationByIP } from '@/lib/services/geolocationService'

/**
 * API Route: GET /api/public/geolocation
 * 
 * Identifica geolocalização aproximada baseada no IP do cliente
 * 
 * Conformidade: GUARDIAN RULES
 * - Incremental: Nova rota isolada
 * - Segurança: Rate limiting, validação de IP
 * - Performance: Cache em memória
 * - Tratamento de erros: Não expõe detalhes sensíveis
 */

// Rate limiting: 10 requisições por IP por hora
const limiter = new RateLimiterMemory({
  points: 10,        // 10 requisições
  duration: 3600     // por hora (3600 segundos)
})

// Cache em memória: IP -> { data, timestamp }
// TTL: 5 minutos (300000 ms)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

/**
 * Limpa cache antigo periodicamente (prevenção de memory leak)
 */
function cleanCache() {
  const now = Date.now()
  for (const [ip, cached] of cache.entries()) {
    if (now - cached.timestamp > CACHE_TTL) {
      cache.delete(ip)
    }
  }
}

// Limpar cache a cada 10 minutos
setInterval(cleanCache, 10 * 60 * 1000)

export async function GET(request: NextRequest) {
  try {
    // Verificar se geolocalização está habilitada
    const geolocationEnabled = process.env.GEOLOCATION_ENABLED !== 'false'
    if (!geolocationEnabled) {
      return NextResponse.json(
        { success: false, message: 'Geolocalização desabilitada' },
        { status: 503 }
      )
    }

    // Capturar IP do cliente (reutiliza função existente)
    const ipAddress = getClientIP(request)
    
    console.log('🔍 [GEOLOCATION API] Requisição recebida para IP:', ipAddress)

    // Verificar rate limiting
    try {
      await limiter.consume(ipAddress)
    } catch (rateLimiterError: any) {
      console.warn('⚠️ [GEOLOCATION API] Rate limit excedido para IP:', ipAddress)
      return NextResponse.json(
        { 
          success: false, 
          message: 'Muitas requisições. Tente novamente mais tarde.',
          error: 'rate_limit_exceeded'
        },
        { status: 429 }
      )
    }

    // Verificar cache
    const cached = cache.get(ipAddress)
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('✅ [GEOLOCATION API] Retornando dados do cache para IP:', ipAddress)
      return NextResponse.json({
        success: true,
        data: cached.data,
        cached: true
      })
    }

    // Consultar serviço de geolocalização
    const geolocationResult = await getGeolocationByIP(ipAddress)

    if (!geolocationResult.success) {
      console.warn('⚠️ [GEOLOCATION API] Falha ao obter geolocalização:', geolocationResult.error)
      
      // Não retornar erro 500 para não quebrar experiência do usuário
      // Retornar sucesso mas sem dados (frontend trata graciosamente)
      return NextResponse.json({
        success: false,
        message: 'Não foi possível detectar localização',
        error: geolocationResult.error || 'unknown_error'
      })
    }

    // Preparar dados de resposta
    const responseData = {
      city: geolocationResult.city,
      region: geolocationResult.region,
      country: geolocationResult.country,
      ip: ipAddress
    }

    // Armazenar no cache
    cache.set(ipAddress, {
      data: responseData,
      timestamp: Date.now()
    })

    console.log('✅ [GEOLOCATION API] Localização detectada:', responseData)

    return NextResponse.json({
      success: true,
      data: responseData,
      cached: false
    })

  } catch (error: any) {
    console.error('❌ [GEOLOCATION API] Erro inesperado:', error)
    
    // Não expor detalhes do erro para o cliente (segurança)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao processar geolocalização',
        error: 'internal_error'
      },
      { status: 500 }
    )
  }
}










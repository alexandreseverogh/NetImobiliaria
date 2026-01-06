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

// Rate limiting: tolerante a refresh (cache reduz chamadas externas)
// Regra de UX: geolocalização pode rodar a cada refresh; então o rate limit por IP não pode ser agressivo.
const limiter = new RateLimiterMemory({
  points: 120,       // 120 requisições
  duration: 3600     // por hora (3600 segundos)
})

// Cache em memória: IP -> { data, timestamp }
// TTL: 24 horas (prioridade: velocidade e menor dependência de provedores externos)
// Importante em dev: usar globalThis para não perder cache em hot-reload/worker reload.
const globalAny = globalThis as any
const cache: Map<string, { data: any; timestamp: number }> =
  globalAny.__netimobiliariaGeolocationCache || (globalAny.__netimobiliariaGeolocationCache = new Map())
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 horas

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

// Limpar cache a cada 10 minutos (registrar apenas uma vez)
if (!globalAny.__netimobiliariaGeolocationCacheCleanerStarted) {
  globalAny.__netimobiliariaGeolocationCacheCleanerStarted = true
  setInterval(cleanCache, 10 * 60 * 1000)
}

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

    // Verificar rate limiting (somente quando NÃO temos cache)
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










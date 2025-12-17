/**
 * Serviço de Geolocalização por IP
 * 
 * Consulta serviços externos para identificar localização aproximada
 * baseada no endereço IP do usuário.
 * 
 * Conformidade: GUARDIAN RULES
 * - Incremental: Nova funcionalidade isolada
 * - Segurança: Validação de IP, timeout, tratamento de erros
 * - Sem hardcoding: URLs em variáveis de ambiente
 */

export interface GeolocationResponse {
  city: string | null
  region: string | null
  country: string | null
  success: boolean
  error?: string
}

export interface GeolocationData {
  city: string
  region: string
  country: string
  ip: string
}

/**
 * Verifica se um IP é localhost/privado
 * Em desenvolvimento, podemos consultar a API sem IP específico (ela detecta automaticamente)
 */
function isLocalOrPrivateIP(ip: string): boolean {
  if (!ip || ip === 'unknown' || ip === 'localhost') {
    return true
  }

  // IPs locais/privados
  const localIPs = [
    '127.0.0.1',
    '::1',
    '0.0.0.0',
    'localhost'
  ]

  if (localIPs.includes(ip)) {
    return true
  }

  // Verificar se é IP privado (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  const privateIPRegex = /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/
  if (privateIPRegex.test(ip)) {
    return true
  }

  return false
}

/**
 * Consulta geolocalização por IP usando serviço externo
 * 
 * @param ipAddress - IP do cliente (obtido via getClientIP)
 * @returns Dados de geolocalização ou null em caso de erro
 */
export async function getGeolocationByIP(ipAddress: string): Promise<GeolocationResponse> {
  try {
    // URL da API (configurável via variável de ambiente)
    // ip-api.com: GET http://ip-api.com/json/{ip}?fields=status,message,country,regionName,city
    // NOTA: ip-api.com não requer API key para uso básico (até 45 req/min)
    // Para uso comercial ou maior volume, pode ser necessário API key
    const apiBaseUrl = process.env.GEOLOCATION_API_URL || 'http://ip-api.com/json'
    const apiKey = process.env.GEOLOCATION_API_KEY || null
    
    // Verificar se IP é localhost/privado
    const isLocal = isLocalOrPrivateIP(ipAddress)
    
    // Se for IP local, consultar API sem IP específico (ela detecta automaticamente)
    // Ou usar IP de teste em desenvolvimento
    let url: string
    let ipToUse = ipAddress
    
    if (isLocal) {
      console.log('ℹ️ [GEOLOCATION] IP local detectado:', ipAddress)
      console.log('ℹ️ [GEOLOCATION] Consultando API sem IP específico (detecção automática)')
      
      // ip-api.com pode ser consultado sem IP para detectar automaticamente
      // Formato: http://ip-api.com/json (sem IP)
      url = `${apiBaseUrl}?fields=status,message,country,regionName,city`
      ipToUse = 'auto-detect'
    } else {
      // IP público válido, usar normalmente
      url = apiBaseUrl.includes('{ip}') 
        ? apiBaseUrl.replace('{ip}', ipAddress)
        : `${apiBaseUrl}/${ipAddress}?fields=status,message,country,regionName,city`
    }
    
    // Adicionar API key se disponível (formato depende da API escolhida)
    if (apiKey) {
      // Para ip-api.com com API key, usar formato: ?key={apiKey}
      // Para outras APIs, ajustar conforme necessário
      url += url.includes('?') ? `&key=${apiKey}` : `?key=${apiKey}`
    }

    console.log('🔍 [GEOLOCATION] Consultando geolocalização para IP:', ipToUse)
    console.log('🔍 [GEOLOCATION] URL da API:', url)
    console.log('🔍 [GEOLOCATION] API Key configurada:', apiKey ? 'Sim' : 'Não (usando modo gratuito)')

    // Fazer requisição com timeout de 5 segundos
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`API retornou status ${response.status}`)
      }

      const data = await response.json()
      
      console.log('🔍 [GEOLOCATION] Resposta da API:', JSON.stringify(data, null, 2))

      // ip-api.com retorna: { status: 'success', city: '...', regionName: '...', country: '...' }
      // Se status for 'fail', retorna: { status: 'fail', message: '...' }
      // Outras APIs podem ter formato diferente
      if (data.status === 'success' && data.city) {
        const city = data.city || null
        const region = data.regionName || data.region || data.state || null
        const country = data.country || data.countryName || null

        console.log('✅ [GEOLOCATION] Localização detectada:', { city, region, country })

        return {
          city,
          region,
          country,
          success: true
        }
      } else if (data.city) {
        // Algumas APIs retornam city diretamente sem status
        const city = data.city || null
        const region = data.regionName || data.region || data.state || null
        const country = data.country || data.countryName || null

        console.log('✅ [GEOLOCATION] Localização detectada (sem status):', { city, region, country })

        return {
          city,
          region,
          country,
          success: true
        }
      } else {
        // API retornou erro
        const errorMessage = data.message || data.error || 'Erro desconhecido na API de geolocalização'
        console.warn('⚠️ [GEOLOCATION] API retornou erro:', errorMessage)
        console.warn('⚠️ [GEOLOCATION] Dados completos da resposta:', data)
        
        return {
          city: null,
          region: null,
          country: null,
          success: false,
          error: errorMessage
        }
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.error('❌ [GEOLOCATION] Timeout ao consultar API (5s)')
        throw new Error('Timeout ao consultar serviço de geolocalização')
      }
      
      throw fetchError
    }
  } catch (error: any) {
    console.error('❌ [GEOLOCATION] Erro ao consultar geolocalização:', error)
    
    return {
      city: null,
      region: null,
      country: null,
      success: false,
      error: error.message || 'Erro ao consultar geolocalização'
    }
  }
}

/**
 * Formata dados de geolocalização para exibição
 */
export function formatGeolocationData(data: GeolocationData): string {
  const parts = [data.city, data.region, data.country].filter(Boolean)
  return parts.join(', ') || 'localização desconhecida'
}


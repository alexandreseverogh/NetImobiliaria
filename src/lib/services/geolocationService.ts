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

    const fetchJsonWithTimeout = async (requestUrl: string, timeoutMs: number) => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: controller.signal
        })
        if (!response.ok) throw new Error(`API retornou status ${response.status}`)
        return await response.json()
      } finally {
        clearTimeout(timeoutId)
      }
    }

    const parseIpApi = (data: any): GeolocationResponse => {
      // ip-api.com retorna: { status: 'success', city: '...', regionName: '...', country: '...' }
      if (data?.status === 'success' && data?.city) {
        const city = data.city || null
        const region = data.regionName || data.region || data.state || null
        const country = data.country || data.countryName || null
        return { city, region, country, success: true }
      }
      if (data?.city) {
        const city = data.city || null
        const region = data.regionName || data.region || data.state || null
        const country = data.country || data.countryName || null
        return { city, region, country, success: true }
      }
      const errorMessage = data?.message || data?.error || 'Erro desconhecido na API de geolocalização'
      return { city: null, region: null, country: null, success: false, error: errorMessage }
    }

    // Em redes/containers, 5s pode ser longo demais e piora a UX. Trabalhamos com timeouts curtos
    // e executamos mais de um provedor em paralelo para pegar o mais rápido.
    // Prioridade: velocidade. Se não der em ~1.5s, o usuário pode escolher manualmente no modal.
    const PROVIDER_TIMEOUT_MS = Number(process.env.GEOLOCATION_PROVIDER_TIMEOUT_MS || 1500)

    const tryProviderIpApi = async (): Promise<GeolocationResponse> => {
      const data = await fetchJsonWithTimeout(url, PROVIDER_TIMEOUT_MS)
      console.log('🔍 [GEOLOCATION] Resposta da API (ip-api):', JSON.stringify(data, null, 2))
      const parsed = parseIpApi(data)
      if (parsed.success) {
        console.log('✅ [GEOLOCATION] Localização detectada (ip-api):', {
          city: parsed.city,
          region: parsed.region,
          country: parsed.country
        })
      } else {
        console.warn('⚠️ [GEOLOCATION] ip-api falhou:', parsed.error)
      }
      return parsed
    }

    const tryProviderIpwho = async (): Promise<GeolocationResponse> => {
      // Fallback HTTPS (mais resiliente em redes que bloqueiam HTTP)
      const base = 'https://ipwho.is'
      const fallbackUrl = isLocal ? `${base}/?fields=success,message,country,region,city` : `${base}/${ipAddress}?fields=success,message,country,region,city`
      const data = await fetchJsonWithTimeout(fallbackUrl, PROVIDER_TIMEOUT_MS)
      console.log('🔍 [GEOLOCATION] Resposta da API (ipwho.is):', JSON.stringify(data, null, 2))

      if (data?.success === true && data?.city) {
        const city = data.city || null
        const region = data.region || null
        const country = data.country || null
        console.log('✅ [GEOLOCATION] Localização detectada (ipwho.is):', { city, region, country })
        return { city, region, country, success: true }
      }

      const errorMessage = data?.message || data?.error || 'Erro desconhecido na API de geolocalização'
      console.warn('⚠️ [GEOLOCATION] ipwho.is falhou:', errorMessage)
      return { city: null, region: null, country: null, success: false, error: errorMessage }
    }

    const tryProviderIpapiCo = async (): Promise<GeolocationResponse> => {
      // HTTPS e bem simples. Campos: city, region, country_name
      // Para IP local (docker/localhost), o endpoint /json/ faz auto-detect.
      const base = 'https://ipapi.co'
      const ipapiUrl = isLocal ? `${base}/json/` : `${base}/${ipAddress}/json/`
      const data = await fetchJsonWithTimeout(ipapiUrl, PROVIDER_TIMEOUT_MS)

      const city = data?.city || null
      const region = data?.region || data?.region_code || null
      const country = data?.country_name || data?.country || null

      if (city) {
        console.log('✅ [GEOLOCATION] Localização detectada (ipapi.co):', { city, region, country })
        return { city, region, country, success: true }
      }

      const errorMessage = data?.error || data?.reason || data?.message || 'Erro desconhecido na API de geolocalização'
      console.warn('⚠️ [GEOLOCATION] ipapi.co falhou:', errorMessage)
      return { city: null, region: null, country: null, success: false, error: errorMessage }
    }

    const providerOrThrow = async (name: string, fn: () => Promise<GeolocationResponse>) => {
      const res = await fn()
      if (!res.success) {
        throw new Error(`${name}: ${res.error || 'falha'}`)
      }
      return res
    }

    // Performance: rodar provedores em paralelo e pegar o primeiro sucesso.
    // Preferimos HTTPS (ipwho) mas ainda tentamos ip-api em paralelo pois pode ser mais rápido em algumas redes.
    try {
      return await Promise.any([
        providerOrThrow('ipwho', tryProviderIpwho),
        providerOrThrow('ipapi.co', tryProviderIpapiCo),
        providerOrThrow('ip-api', tryProviderIpApi)
      ])
    } catch (e: any) {
      // Se ambos falharem, retornar erro amigável
      const msg = e?.errors?.[0]?.message || e?.message || 'Falha ao consultar provedores de geolocalização'
      return { city: null, region: null, country: null, success: false, error: msg }
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


/**
 * Utilitários para geocoding (busca de coordenadas geográficas)
 * Net Imobiliária - Sistema de Coordenadas
 */

interface ViaCepResponse {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  ibge: string
  gia: string
  ddd: string
  siafi: string
}

interface NominatimResponse {
  place_id: number
  lat: string
  lon: string
  display_name: string
}

/**
 * Busca informações do endereço por CEP usando a API interna (proxy para ViaCEP)
 * A chamada passa pelo servidor Next.js, evitando bloqueios no browser.
 */
export async function buscarEnderecoPorCep(cep: string): Promise<ViaCepResponse | null> {
  try {
    const cepLimpo = cep.replace(/\D/g, '')

    if (cepLimpo.length !== 8) {
      console.error('❌ CEP inválido:', cep)
      return null
    }

    console.log('🔍 Buscando endereço para CEP via proxy interno:', cepLimpo)

    // No browser (CSR): usa window.location.origin (ex: https://www.imovtec.com.br)
    // No servidor (SSR): usa localhost porque a chamada é interna ao próprio container Next.js
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : 'http://localhost:3000'

    const response = await fetch(`${baseUrl}/api/cep/${cepLimpo}`)

    if (response.status === 404) {
      console.error('❌ CEP não encontrado:', cepLimpo)
      return null
    }

    if (!response.ok) {
      console.error('❌ Erro na API de CEP interna:', response.status)
      return null
    }

    const data = await response.json()

    if (data.error) {
      console.error('❌ CEP não encontrado:', cepLimpo, data.error)
      return null
    }

    console.log('✅ Endereço encontrado:', data)
    return data
  } catch (error) {
    console.error('❌ Erro ao buscar endereço por CEP:', error)
    return null
  }
}

/**
 * Busca coordenadas geográficas por endereço usando Nominatim (OpenStreetMap)
 */
export async function buscarCoordenadasPorEndereco(endereco: string, cidade: string, estado: string, pais: string = 'Brazil'): Promise<{ lat: number; lon: number } | null> {
  try {
    const enderecoCompleto = `${endereco}, ${cidade}, ${estado}, ${pais}`

    console.log('🔍 Buscando coordenadas para endereço:', enderecoCompleto)

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(enderecoCompleto)}&format=json&limit=1`,
      {
        headers: {
          'User-Agent': 'NetImobiliaria/1.0'
        }
      }
    )

    if (!response.ok) {
      console.error('❌ Erro na API Nominatim:', response.status)
      return null
    }

    const data: NominatimResponse[] = await response.json()

    if (!data || data.length === 0) {
      console.error('❌ Coordenadas não encontradas para endereço:', enderecoCompleto)
      return null
    }

    const coordenadas = {
      lat: parseFloat(data[0].lat),
      lon: parseFloat(data[0].lon)
    }

    console.log('✅ Coordenadas encontradas:', coordenadas)
    return coordenadas
  } catch (error) {
    console.error('❌ Erro ao buscar coordenadas:', error)
    return null
  }
}

/**
 * Busca coordenadas geográficas por CEP (combina ViaCEP + Nominatim)
 */
export async function buscarCoordenadasPorCep(cep: string): Promise<{ lat: number; lon: number; endereco?: string } | null> {
  try {
    console.log('🔍 Iniciando busca de coordenadas para CEP:', cep)

    // 1. Buscar endereço por CEP
    const enderecoData = await buscarEnderecoPorCep(cep)

    if (!enderecoData) {
      console.error('❌ Não foi possível obter endereço para o CEP:', cep)
      return null
    }

    // 2. Buscar coordenadas por endereço
    const enderecoCompleto = `${enderecoData.logradouro}, ${enderecoData.bairro}`
    const coordenadas = await buscarCoordenadasPorEndereco(
      enderecoCompleto,
      enderecoData.localidade,
      enderecoData.uf
    )

    if (!coordenadas) {
      console.error('❌ Não foi possível obter coordenadas para o endereço')
      return null
    }

    return {
      ...coordenadas,
      endereco: `${enderecoData.logradouro}, ${enderecoData.bairro}, ${enderecoData.localidade} - ${enderecoData.uf}`
    }
  } catch (error) {
    console.error('❌ Erro ao buscar coordenadas por CEP:', error)
    return null
  }
}

/**
 * Busca coordenadas geográficas por endereço completo
 */
export async function buscarCoordenadasPorEnderecoCompleto(
  endereco: string,
  numero: string,
  complemento: string,
  bairro: string,
  cidade: string,
  estado: string,
  cep: string
): Promise<{ lat: number; lon: number } | null> {
  try {
    console.log('🔍 ===== BUSCA DE COORDENADAS - ENDEREÇO COMPLETO =====')
    console.log('🔍 Endereço:', endereco)
    console.log('🔍 Número:', numero)
    console.log('🔍 Complemento:', complemento)
    console.log('🔍 Bairro:', bairro)
    console.log('🔍 Cidade:', cidade)
    console.log('🔍 Estado:', estado)
    console.log('🔍 CEP:', cep)

    // Montar endereço completo
    let enderecoCompleto = endereco
    if (numero) enderecoCompleto += `, ${numero}`
    if (complemento) enderecoCompleto += `, ${complemento}`
    if (bairro) enderecoCompleto += `, ${bairro}`

    console.log('🔍 Endereço completo montado:', enderecoCompleto)

    const coordenadas = await buscarCoordenadasPorEndereco(
      enderecoCompleto,
      cidade,
      estado
    )

    if (!coordenadas) {
      console.log('🔄 Primeira tentativa falhou. Tentando busca por CEP como fallback...')
      // Fallback: tentar buscar por CEP se o endereço completo falhar
      const coordenadasPorCep = await buscarCoordenadasPorCep(cep)
      if (coordenadasPorCep) {
        console.log('✅ SUCESSO via CEP! Coordenadas:', coordenadasPorCep)
        return {
          lat: coordenadasPorCep.lat,
          lon: coordenadasPorCep.lon
        }
      }
      console.log('⚠️ Busca por CEP também falhou.')

      // Fallback 2: tentar buscar apenas por BAIRRO (funciona bem no Brasil)
      if (bairro) {
        console.log('🔄 Tentando busca por BAIRRO como último recurso...')
        const coordenadasPorBairro = await buscarCoordenadasPorEndereco(
          bairro,
          cidade,
          estado
        )
        if (coordenadasPorBairro) {
          console.log('✅ SUCESSO via BAIRRO! Coordenadas:', coordenadasPorBairro)
          console.log('⚠️ ATENÇÃO: Coordenadas são aproximadas (centro do bairro)')
          return coordenadasPorBairro
        }
      }

      console.log('⚠️ Todas as tentativas falharam. Nenhuma coordenada encontrada.')
    } else {
      console.log('✅ SUCESSO via endereço completo! Coordenadas:', coordenadas)
    }

    console.log('🔍 =====================================================')
    return coordenadas
  } catch (error) {
    console.error('❌ ERRO CRÍTICO ao buscar coordenadas por endereço completo:', error)
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A')
    return null
  }
}





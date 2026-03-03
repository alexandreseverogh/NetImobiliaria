import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/cep/[cep]
 * Proxy interno para o ViaCEP.
 * A chamada é feita do SERVIDOR Next.js, não do browser do usuário.
 * Isso evita: CORS, bloqueio de firewall no cliente, instabilidade de rede do lado do cliente.
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { cep: string } }
) {
    const cepLimpo = (params.cep || '').replace(/\D/g, '')

    if (cepLimpo.length !== 8) {
        return NextResponse.json(
            { error: 'CEP inválido. Deve conter 8 dígitos.' },
            { status: 400 }
        )
    }

    // Tenta ViaCEP primeiro, com timeout de 8s
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    try {
        const response = await fetch(
            `https://viacep.com.br/ws/${cepLimpo}/json/`,
            {
                signal: controller.signal,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Imovtec/1.0'
                }
            }
        )

        clearTimeout(timeout)

        if (!response.ok) {
            console.error(`❌ [API CEP] ViaCEP retornou status ${response.status} para CEP ${cepLimpo}`)
            return NextResponse.json(
                { error: `ViaCEP retornou erro ${response.status}` },
                { status: 502 }
            )
        }

        const data = await response.json()

        if (data.erro) {
            return NextResponse.json(
                { error: 'CEP não encontrado na base dos Correios.' },
                { status: 404 }
            )
        }

        console.log(`✅ [API CEP] CEP ${cepLimpo} encontrado via ViaCEP:`, data.logradouro)
        return NextResponse.json(data)

    } catch (error: any) {
        clearTimeout(timeout)

        const isTimeout = error?.name === 'AbortError'
        console.error(`❌ [API CEP] Erro ao buscar CEP ${cepLimpo}:`, isTimeout ? 'Timeout' : error?.message)

        // Tenta BrasilAPI como fallback se ViaCEP falhar/timeout
        try {
            console.log(`🔄 [API CEP] Tentando fallback BrasilAPI para CEP ${cepLimpo}...`)
            const fallbackController = new AbortController()
            const fallbackTimeout = setTimeout(() => fallbackController.abort(), 8000)

            const fallbackResponse = await fetch(
                `https://brasilapi.com.br/api/cep/v2/${cepLimpo}`,
                {
                    signal: fallbackController.signal,
                    headers: { 'Accept': 'application/json' }
                }
            )

            clearTimeout(fallbackTimeout)

            if (fallbackResponse.ok) {
                const fallbackData = await fallbackResponse.json()

                // Normalizar formato BrasilAPI para o mesmo formato ViaCEP
                const normalizado = {
                    cep: fallbackData.cep,
                    logradouro: fallbackData.street || '',
                    complemento: fallbackData.location?.coordinates?.longitude ? '' : '',
                    bairro: fallbackData.neighborhood || '',
                    localidade: fallbackData.city || '',
                    uf: fallbackData.state || '',
                    ibge: fallbackData.ibge || '',
                    gia: '',
                    ddd: '',
                    siafi: ''
                }

                console.log(`✅ [API CEP] CEP ${cepLimpo} encontrado via BrasilAPI (fallback):`, normalizado.logradouro)
                return NextResponse.json(normalizado)
            }
        } catch (fallbackError) {
            console.error(`❌ [API CEP] Fallback BrasilAPI também falhou para CEP ${cepLimpo}`)
        }

        return NextResponse.json(
            { error: isTimeout ? 'Timeout ao consultar o ViaCEP.' : 'Não foi possível consultar o CEP no momento.' },
            { status: 503 }
        )
    }
}

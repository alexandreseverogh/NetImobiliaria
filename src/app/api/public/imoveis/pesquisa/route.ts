import { NextRequest, NextResponse } from 'next/server'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { listPublicImoveis } from '@/lib/database/imoveis-public'

const limiter = new RateLimiterMemory({
  points: 60,
  duration: 60
})

export async function GET(request: NextRequest) {
  try {
    const ip = request.ip ?? 'public'
    await limiter.consume(ip)

    const { searchParams } = new URL(request.url)

    const operation = searchParams.get('operation') as 'DV' | 'DA' | null
    
    const filters = {
      tipoIds: parseNumberArray(searchParams.getAll('tipo')),
      estado: searchParams.get('estado') || undefined,
      cidade: sanitizeLike(searchParams.get('cidade')),
      bairro: sanitizeLike(searchParams.get('bairro')),
      precoMin: parseNumber(searchParams.get('preco_min')),
      precoMax: parseNumber(searchParams.get('preco_max')),
      quartosMin: parseNumber(searchParams.get('quartos_min')),
      quartosMax: parseNumber(searchParams.get('quartos_max')),
      banheirosMin: parseNumber(searchParams.get('banheiros_min')),
      banheirosMax: parseNumber(searchParams.get('banheiros_max')),
      suitesMin: parseNumber(searchParams.get('suites_min')),
      suitesMax: parseNumber(searchParams.get('suites_max')),
      vagasMin: parseNumber(searchParams.get('vagas_min')),
      vagasMax: parseNumber(searchParams.get('vagas_max')),
      areaMin: parseNumber(searchParams.get('area_min')),
      areaMax: parseNumber(searchParams.get('area_max')),
      operation: operation || 'DV', // Default: Comprar
      page: parseNumber(searchParams.get('page')) || 1,
      limit: parseNumber(searchParams.get('limit')) || 20
    }

    // Log para debug
    console.log('🔍 [API /pesquisa] Filtros recebidos:', {
      operation: filters.operation,
      estado: filters.estado,
      cidade: filters.cidade,
      tipoIds: filters.tipoIds,
      tipoIdsLength: filters.tipoIds?.length,
      todosFiltros: filters
    })

    const resultado = await listPublicImoveis(filters)
    
    console.log('🔍 [API /pesquisa] Resultado:', {
      total: resultado.total,
      quantidade: resultado.data.length,
      operation: filters.operation
    })

    return NextResponse.json({
      success: true,
      data: resultado.data,
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total: resultado.total,
        totalPages: Math.ceil(resultado.total / filters.limit!)
      }
    })
  } catch (error) {
    if (error instanceof Error && error.message.includes('Rate limit')) {
      return NextResponse.json(
        { success: false, error: 'Muitas requisições. Aguarde e tente novamente.' },
        { status: 429 }
      )
    }

    console.error('❌ Erro na busca pública de imóveis:', error)

    return NextResponse.json(
      { success: false, error: 'Erro ao buscar imóveis' },
      { status: 500 }
    )
  }
}

function parseNumber(value: string | null): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseNumberArray(values: string[]): number[] | undefined {
  const parsed = values
    .map(value => Number(value))
    .filter(value => Number.isFinite(value))

  return parsed.length ? parsed : undefined
}

function sanitizeLike(value: string | null): string | undefined {
  if (!value) return undefined
  return value.replace(/[%_]/g, '').trim()
}


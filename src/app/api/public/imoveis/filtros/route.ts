import { NextRequest, NextResponse } from 'next/server'
import { getPublicFiltersMetadata } from '@/lib/database/imoveis-public'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipoDestaque = searchParams.get('tipo_destaque') as 'DV' | 'DA' | null
    const estado = searchParams.get('estado') || undefined
    const cidade = searchParams.get('cidade') || undefined
    const tipoId = searchParams.get('tipo_id') || undefined
    
    // Se há filtros aplicados (precoMin, precoMax, etc.), usar esses filtros para recalcular metadados
    // Isso garante que os metadados reflitam apenas os imóveis que correspondem aos filtros aplicados
    const precoMin = searchParams.get('precoMin') ? Number(searchParams.get('precoMin')) : undefined
    const precoMax = searchParams.get('precoMax') ? Number(searchParams.get('precoMax')) : undefined
    const areaMin = searchParams.get('areaMin') ? Number(searchParams.get('areaMin')) : undefined
    const areaMax = searchParams.get('areaMax') ? Number(searchParams.get('areaMax')) : undefined
    const quartosMin = searchParams.get('quartosMin') ? Number(searchParams.get('quartosMin')) : undefined
    const quartosMax = searchParams.get('quartosMax') ? Number(searchParams.get('quartosMax')) : undefined
    const banheirosMin = searchParams.get('banheirosMin') ? Number(searchParams.get('banheirosMin')) : undefined
    const banheirosMax = searchParams.get('banheirosMax') ? Number(searchParams.get('banheirosMax')) : undefined
    const suitesMin = searchParams.get('suitesMin') ? Number(searchParams.get('suitesMin')) : undefined
    const suitesMax = searchParams.get('suitesMax') ? Number(searchParams.get('suitesMax')) : undefined
    const vagasMin = searchParams.get('vagasMin') ? Number(searchParams.get('vagasMin')) : undefined
    const vagasMax = searchParams.get('vagasMax') ? Number(searchParams.get('vagasMax')) : undefined
    const bairro = searchParams.get('bairro') || undefined
    
    const metadata = await getPublicFiltersMetadata(
      tipoDestaque || undefined,
      estado,
      cidade,
      tipoId ? Number(tipoId) : undefined,
      {
        precoMin,
        precoMax,
        areaMin,
        areaMax,
        quartosMin,
        quartosMax,
        banheirosMin,
        banheirosMax,
        suitesMin,
        suitesMax,
        vagasMin,
        vagasMax,
        bairro
      }
    )

    return NextResponse.json({
      success: true,
      metadata
    })
  } catch (error) {
    console.error('❌ Erro ao carregar metadados públicos de filtros:', error)
    return NextResponse.json(
      { success: false, error: 'Não foi possível carregar os filtros.' },
      { status: 500 }
    )
  }
}


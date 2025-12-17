import { NextRequest, NextResponse } from 'next/server'
import { findAllTiposImovel } from '@/lib/database/tipos-imoveis'

export async function GET(request: NextRequest) {
  try {
    // Listar tipos de imóveis
    const tipos = await findAllTiposImovel()

    return NextResponse.json(tipos)

  } catch (error) {
    console.error('Erro ao listar tipos de imóveis:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

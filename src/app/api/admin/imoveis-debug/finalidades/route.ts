import { NextRequest, NextResponse } from 'next/server'
import { findAllFinalidades } from '@/lib/database/finalidades'

export async function GET(request: NextRequest) {
  try {
    // Listar finalidades de imóveis
    const finalidades = await findAllFinalidades()

    return NextResponse.json(finalidades)

  } catch (error) {
    console.error('Erro ao listar finalidades de imóveis:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}



import { NextRequest, NextResponse } from 'next/server'
import { listStatusImovel } from '@/lib/database/imoveis'

export async function GET(request: NextRequest) {
  try {
    // Listar status de imóveis
    const status = await listStatusImovel()

    return NextResponse.json(status)

  } catch (error) {
    console.error('Erro ao listar status de imóveis:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

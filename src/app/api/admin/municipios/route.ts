import { NextResponse } from 'next/server'
import municipiosData from '@/lib/admin/municipios.json'

export async function GET() {
  try {
    return NextResponse.json(municipiosData)
  } catch (error) {
    console.error('Erro ao carregar municípios:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

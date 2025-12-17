import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('🔍 Teste API simples - Iniciando...')
    
    return NextResponse.json({
      success: true,
      message: 'API funcionando!',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erro no teste simples:', error)
    return NextResponse.json(
      { error: 'Erro: ' + (error as Error).message },
      { status: 500 }
    )
  }
}








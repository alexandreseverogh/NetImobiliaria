import { NextRequest, NextResponse } from 'next/server'

// GET - Teste mais simples possível
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 TESTE SIMPLES - API chamada para role ID:', params.id)
    
    return NextResponse.json({
      success: true,
      message: 'API funcionando!',
      roleId: params.id,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ TESTE SIMPLES - Erro:', error.message)
    } else {
      console.error('❌ TESTE SIMPLES - Erro desconhecido:', error)
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    )
  }
}



import { NextRequest, NextResponse } from 'next/server'

// DELETE - Excluir finalidade (VERSÃO ULTRA-SIMPLIFICADA)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const parsedId = parseInt(params.id)
  try {
    console.log('🔍 API DELETE TESTE - Iniciando exclusão da finalidade')
    console.log('🔍 API DELETE TESTE - ID recebido:', parsedId)
    
    if (isNaN(parsedId)) {
      console.log('🔍 API DELETE TESTE - ID inválido')
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    console.log('🔍 API DELETE TESTE - Retornando erro simulado')
    return NextResponse.json(
      { 
        error: 'Existem 1 imóvel(is) cadastrado(s) associado(s) a esta finalidade. Remova os imóveis primeiro antes de excluir a finalidade.',
        success: false,
        details: {
          id: parsedId,
          timestamp: new Date().toISOString()
        }
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

  } catch (error) {
    console.error('❌ Erro ao excluir finalidade:', error)
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        success: false,
        details: {
          id: parsedId,
          timestamp: new Date().toISOString()
        }
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}





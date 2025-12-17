import { NextResponse } from 'next/server'
import { findCategoriaProximidadeById, updateCategoriaProximidade, deleteCategoriaProximidade } from '@/lib/database/proximidades'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const categoria = await findCategoriaProximidadeById(id)
    if (!categoria) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: categoria
    })
  } catch (error) {
    console.error('Erro ao buscar categoria de proximidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { nome, descricao, icone, cor, ordem, ativo } = body
    
    if (!nome || !descricao) {
      return NextResponse.json(
        { error: 'Nome e descrição são obrigatórios' },
        { status: 400 }
      )
    }

    const categoriaAtualizada = await updateCategoriaProximidade(id, {
      nome,
      descricao,
      icone: icone || 'map-pin',
      cor: cor || '#10B981',
      ordem: ordem || 1,
      ativo: ativo !== undefined ? ativo : true
    })

    return NextResponse.json({
      success: true,
      data: categoriaAtualizada
    })
  } catch (error) {
    console.error('Erro ao atualizar categoria de proximidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    await deleteCategoriaProximidade(id)

    return NextResponse.json({
      success: true,
      message: 'Categoria excluída com sucesso'
    })
  } catch (error) {
    console.error('Erro ao excluir categoria de proximidade:', error)
    
    // Se for um erro de validação (categoria com proximidades associadas), retornar erro 400
    if (error instanceof Error && error.message.includes('Não é possível excluir')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

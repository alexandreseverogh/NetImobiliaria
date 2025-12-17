import { NextRequest, NextResponse } from 'next/server'
import { findFinalidadeById, updateFinalidade, deleteFinalidade } from '@/lib/database/finalidades'

// GET - Buscar finalidade por ID
export async function GET(
  request: NextRequest,
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

    const finalidade = await findFinalidadeById(id)
    if (!finalidade) {
      return NextResponse.json(
        { error: 'Finalidade não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: finalidade
    })

  } catch (error) {
    console.error('Erro ao buscar finalidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar finalidade
export async function PUT(
  request: NextRequest,
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
    const { nome, descricao, ativo } = body

    const finalidadeAtualizada = await updateFinalidade(id, {
      nome,
      descricao,
      ativo
    })

    return NextResponse.json({
      success: true,
      data: finalidadeAtualizada
    })

  } catch (error) {
    console.error('Erro ao atualizar finalidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir finalidade
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

    await deleteFinalidade(id)

    return NextResponse.json({
      success: true,
      message: 'Finalidade excluída com sucesso'
    })

  } catch (error) {
    console.error('Erro ao excluir finalidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

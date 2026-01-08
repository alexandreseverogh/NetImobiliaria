/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { findStatusImovelById, updateStatusImovel, deleteStatusImovel } from '@/lib/database/status-imovel'

// GET - Buscar status de imóvel por ID
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

    const statusImovel = await findStatusImovelById(id)
    if (!statusImovel) {
      return NextResponse.json(
        { error: 'Status de imóvel não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: statusImovel
    })

  } catch (error) {
    console.error('Erro ao buscar status de imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar status de imóvel
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
    const { nome, cor, descricao, ativo, consulta_imovel_internauta } = body

    const statusImovelAtualizado = await updateStatusImovel(id, {
      nome,
      cor,
      descricao,
      ativo,
      consulta_imovel_internauta
    })

    return NextResponse.json({
      success: true,
      data: statusImovelAtualizado
    })

  } catch (error) {
    console.error('Erro ao atualizar status de imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir status de imóvel
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

    await deleteStatusImovel(id)

    return NextResponse.json({
      success: true,
      message: 'Status de imóvel excluído com sucesso'
    })

  } catch (error) {
    console.error('Erro ao excluir status de imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

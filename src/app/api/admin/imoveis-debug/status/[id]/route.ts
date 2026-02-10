import { NextRequest, NextResponse } from 'next/server'
import { findStatusImovelById, updateStatusImovel, deleteStatusImovel } from '@/lib/database/imoveis'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const statusId = parseInt(params.id)
    
    if (isNaN(statusId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const status = await findStatusImovelById(statusId)
    
    if (!status) {
      return NextResponse.json(
        { error: 'Status não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      status: status
    })

  } catch (error) {
    console.error('Erro ao buscar status:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const statusId = parseInt(params.id)
    
    if (isNaN(statusId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { nome, descricao, ativo } = body

    if (!nome || !nome.trim()) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    const updatedStatus = await updateStatusImovel(statusId, {
      nome: nome.trim(),
      descricao: descricao?.trim() || null,
      ativo: ativo !== undefined ? ativo : true
    })

    return NextResponse.json({
      success: true,
      status: updatedStatus
    })

  } catch (error) {
    console.error('Erro ao atualizar status:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const statusId = parseInt(params.id)
    
    if (isNaN(statusId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    await deleteStatusImovel(statusId)

    return NextResponse.json({
      success: true,
      message: 'Status excluído com sucesso'
    })

  } catch (error) {
    console.error('Erro ao excluir status:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

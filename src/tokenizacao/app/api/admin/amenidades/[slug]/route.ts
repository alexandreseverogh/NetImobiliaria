import { NextRequest, NextResponse } from 'next/server'
import { findAmenidadeBySlug, updateAmenidadeBySlug, deleteAmenidadeBySlug } from '@/lib/database/amenidades'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const amenidade = await findAmenidadeBySlug(slug)
    if (!amenidade) {
      return NextResponse.json(
        { error: 'Amenidade não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: amenidade
    })
  } catch (error) {
    console.error('Erro ao buscar amenidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    const body = await request.json()
    const { nome, categoria_id, descricao, status } = body

    if (!nome || !categoria_id) {
      return NextResponse.json(
        { error: 'Nome e categoria são obrigatórios' },
        { status: 400 }
      )
    }

    // Mapear status para ativo (backend usa ativo, frontend usa status)
    // Se status for undefined, manter o valor atual
    const ativo = status !== undefined ? (status === 'Ativo') : undefined

    const amenidadeAtualizada = await updateAmenidadeBySlug(slug, {
      nome,
      categoria_id,
      descricao,
      ativo
    })

    return NextResponse.json({
      success: true,
      data: amenidadeAtualizada
    })
  } catch (error) {
    console.error('Erro ao atualizar amenidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    console.log('🗑️ API: Tentando excluir amenidade com slug:', slug)

    await deleteAmenidadeBySlug(slug)
    console.log('✅ API: Amenidade excluída com sucesso')

    return NextResponse.json({
      success: true,
      message: 'Amenidade excluída com sucesso'
    })
  } catch (error) {
    console.error('❌ API: Erro ao excluir amenidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

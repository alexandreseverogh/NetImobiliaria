/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { findProximidadeBySlug, updateProximidadeBySlug, deleteProximidadeBySlug } from '@/lib/database/proximidades'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const proximidade = await findProximidadeBySlug(slug)
    if (!proximidade) {
      return NextResponse.json(
        { error: 'Proximidade não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: proximidade
    })
  } catch (error) {
    console.error('Erro ao buscar proximidade:', error)
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

    const proximidadeAtualizada = await updateProximidadeBySlug(slug, {
      nome,
      categoria_id,
      descricao,
      ativo
    })

    return NextResponse.json({
      success: true,
      data: proximidadeAtualizada
    })
  } catch (error) {
    console.error('Erro ao atualizar proximidade:', error)
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
    console.log('🗑️ API: Tentando excluir proximidade com slug:', slug)

    await deleteProximidadeBySlug(slug)
    console.log('✅ API: Proximidade excluída com sucesso')

    return NextResponse.json({
      success: true,
      message: 'Proximidade excluída com sucesso'
    })
  } catch (error) {
    console.error('❌ API: Erro ao excluir proximidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

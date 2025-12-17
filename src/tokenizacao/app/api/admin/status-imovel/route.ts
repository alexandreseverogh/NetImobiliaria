import { NextRequest, NextResponse } from 'next/server'
import { findAllStatusImovel, createStatusImovel, findStatusImovelPaginated } from '@/lib/database/status-imovel'
import { PAGINATION_CONFIG } from '@/lib/config/constants'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

// GET - Listar status de imóvel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''

    // Se não há parâmetros de paginação, usar a função antiga para compatibilidade
    if (!searchParams.has('page') && !searchParams.has('limit')) {
      const statusImovel = await findAllStatusImovel()
      return NextResponse.json(statusImovel)
    }

    // Usar paginação
    const result = await findStatusImovelPaginated(page, limit, search)

    return NextResponse.json({
      success: true,
      statusImovel: result.statusImovel,
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev
    })
  } catch (error) {
    console.error('Erro ao listar status de imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo status de imóvel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nome, cor, descricao, ativo, consulta_imovel_internauta } = body

    if (!nome) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    const novoStatusImovel = await createStatusImovel({
      nome,
      cor: cor || '#3B82F6',
      descricao: descricao || '',
      ativo: ativo !== undefined ? ativo : true,
      consulta_imovel_internauta: consulta_imovel_internauta !== undefined ? consulta_imovel_internauta : true
    })

    return NextResponse.json({
      success: true,
      data: novoStatusImovel
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar status de imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

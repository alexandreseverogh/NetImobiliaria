import { NextRequest, NextResponse } from 'next/server'
import { findAllFinalidades, createFinalidade, findFinalidadesPaginated } from '@/lib/database/finalidades'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    
    if (!searchParams.has('page') && !searchParams.has('limit')) {
      const finalidades = await findAllFinalidades()
      return NextResponse.json(finalidades)
    }
    
    const result = await findFinalidadesPaginated(page, limit, search)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao listar finalidades:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nome, descricao, ativo } = body
    
    if (!nome) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }
    
    const novaFinalidade = await createFinalidade({
      nome,
      descricao: descricao || '',
      ativo: ativo !== undefined ? ativo : true
    })
    
    return NextResponse.json({
      success: true,
      data: novaFinalidade
    }, { status: 201 })
    
  } catch (error) {
    console.error('Erro ao criar finalidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}



/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { findAllProximidades, createProximidade, findProximidadesPaginated } from '@/lib/database/proximidades'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const categoria = searchParams.get('categoria') || ''
    const search = searchParams.get('search') || ''
    
    // Se nÃ£o hÃ¡ parÃ¢metros de paginaÃ§Ã£o, usar a funÃ§Ã£o antiga para compatibilidade
    if (!searchParams.has('page') && !searchParams.has('limit')) {
      const proximidades = await findAllProximidades()
      return NextResponse.json(proximidades)
    }
    
    // Usar paginaÃ§Ã£o com filtro de categoria e busca
    const result = await findProximidadesPaginated(page, limit, categoria, search)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao listar proximidades:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nome, categoria, descricao, ativo } = body
    
    if (!nome || !categoria) {
      return NextResponse.json(
        { error: 'Nome e categoria sÃ£o obrigatÃ³rios' },
        { status: 400 }
      )
    }
    
    // Buscar o ID da categoria pelo nome
    const categoriasResponse = await fetch(`${request.headers.get('origin')}/api/admin/categorias-proximidades`)
    const categorias = await categoriasResponse.json()
    const categoriaEncontrada = categorias.find((cat: any) => cat.nome === categoria)
    
    if (!categoriaEncontrada) {
      return NextResponse.json(
        { error: 'Categoria nÃ£o encontrada' },
        { status: 400 }
      )
    }
    
    const novaProximidade = await createProximidade({
      nome,
      descricao: descricao || '',
      categoria_id: categoriaEncontrada.id,
      ativo: ativo !== undefined ? ativo : true,
      popular: false,
      ordem: 0
    })
    
    return NextResponse.json({
      success: true,
      data: novaProximidade
    }, { status: 201 })
    
  } catch (error) {
    console.error('Erro ao criar proximidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}





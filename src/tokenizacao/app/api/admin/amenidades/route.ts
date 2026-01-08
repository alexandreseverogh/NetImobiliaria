/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { findAllAmenidades, createAmenidade, findAmenidadesPaginated } from '@/lib/database/amenidades'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const categoria = searchParams.get('categoria') || ''
    const search = searchParams.get('search') || ''
    
    // Se nÃ£o hÃ¡ parÃ¢metros de paginaÃ§Ã£o, usar a funÃ§Ã£o antiga para compatibilidade
    if (!searchParams.has('page') && !searchParams.has('limit')) {
      const amenidades = await findAllAmenidades()
      return NextResponse.json(amenidades)
    }
    
    // Usar paginaÃ§Ã£o com filtro de categoria e busca
    const result = await findAmenidadesPaginated(page, limit, categoria, search)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao listar amenidades:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nome, categoria, descricao, ativo }: {
      nome: string
      categoria: string
      descricao?: string
      ativo?: boolean
    } = body
    
    if (!nome || !categoria) {
      return NextResponse.json(
        { error: 'Nome e categoria sÃ£o obrigatÃ³rios' },
        { status: 400 }
      )
    }
    
    // Buscar o ID da categoria pelo nome
    const categoriasResponse = await fetch(`${request.headers.get('origin')}/api/admin/categorias-amenidades`)
    const categorias = await categoriasResponse.json()
    const categoriaEncontrada = categorias.find((cat: any) => cat.nome === categoria)
    
    if (!categoriaEncontrada) {
      return NextResponse.json(
        { error: 'Categoria nÃ£o encontrada' },
        { status: 400 }
      )
    }
    
    const novaAmenidade = await createAmenidade({
      nome,
      descricao: descricao || '',
      categoria_id: categoriaEncontrada.id,
      ativo: ativo !== undefined ? ativo : true,
      popular: false,
      ordem: 0
    })
    
    return NextResponse.json({
      success: true,
      data: novaAmenidade
    }, { status: 201 })
    
  } catch (error) {
    console.error('Erro ao criar amenidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}





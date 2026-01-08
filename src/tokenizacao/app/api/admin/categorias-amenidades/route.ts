/* eslint-disable */
import { NextResponse } from 'next/server'
import { findAllCategoriasAmenidades, createCategoriaAmenidade } from '@/lib/database/amenidades'

export async function GET() {
  try {
    console.log('ðŸ”„ API: Iniciando busca de categorias de amenidades...')
    
    const categorias = await findAllCategoriasAmenidades()
    console.log(`âœ… API: ${categorias.length} categorias encontradas`)
    
    // Retornar diretamente o array para compatibilidade com o frontend
    return NextResponse.json(categorias)
  } catch (error) {
    console.error('âŒ API: Erro ao listar categorias de amenidades:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    const { nome, descricao, icone, cor, ordem, ativo } = body
    
    if (!nome || !descricao) {
      return NextResponse.json(
        { error: 'Nome e descriÃ§Ã£o sÃ£o obrigatÃ³rios' },
        { status: 400 }
      )
    }
    
    const novaCategoria = await createCategoriaAmenidade({
      nome,
      descricao,
      icone: icone || 'star',
      cor: cor || '#3B82F6',
      ordem: ordem || 1,
      ativo: ativo !== undefined ? ativo : true
    })
    
    return NextResponse.json({
      success: true,
      data: novaCategoria
    }, { status: 201 })
    
  } catch (error) {
    console.error('Erro ao criar categoria de amenidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}








import { NextResponse } from 'next/server'
import { findAllCategoriasProximidades, createCategoriaProximidade } from '@/lib/database/proximidades'

export async function GET() {
  try {
    const categorias = await findAllCategoriasProximidades()
    
    // Retornar diretamente o array para compatibilidade com o frontend
    return NextResponse.json(categorias)
  } catch (error) {
    console.error('Erro ao listar categorias de proximidades:', error)
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
        { error: 'Nome e descrição são obrigatórios' },
        { status: 400 }
      )
    }
    
    const novaCategoria = await createCategoriaProximidade({
      nome,
      descricao,
      icone: icone || 'map-pin',
      cor: cor || '#10B981',
      ordem: ordem || 1,
      ativo: ativo !== undefined ? ativo : true
    })
    
    return NextResponse.json({
      success: true,
      data: novaCategoria
    }, { status: 201 })
    
  } catch (error) {
    console.error('Erro ao criar categoria de proximidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}







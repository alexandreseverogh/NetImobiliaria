import { NextRequest, NextResponse } from 'next/server'
import { findClientesPaginated, createCliente } from '@/lib/database/clientes'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    // Extrair filtros
    const nome = searchParams.get('nome') || undefined
    const cpf = searchParams.get('cpf') || undefined
    const estado = searchParams.get('estado') || undefined
    const cidade = searchParams.get('cidade') || undefined
    const bairro = searchParams.get('bairro') || undefined
    
    const result = await findClientesPaginated(page, limit, {
      nome,
      cpf,
      estado,
      cidade,
      bairro
    })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao listar clientes:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nome, cpf, telefone, email, endereco, numero, bairro, estado_fk, cidade_fk, cep, created_by } = body
    
    if (!nome || !cpf || !telefone || !email) {
      return NextResponse.json(
        { error: 'Nome, CPF, telefone e email são obrigatórios' },
        { status: 400 }
      )
    }
    
    const cliente = await createCliente({
      nome,
      cpf,
      telefone,
      email,
      endereco,
      numero,
      bairro,
      estado_fk: estado_fk || undefined,
      cidade_fk: cidade_fk || undefined,
      cep,
      created_by: created_by || 'system'
    })
    
    return NextResponse.json(cliente, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar cliente:', error)
    
    if (error.message === 'CPF já cadastrado' || error.message === 'Email já cadastrado') {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

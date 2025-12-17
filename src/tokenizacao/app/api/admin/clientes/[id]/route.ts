import { NextRequest, NextResponse } from 'next/server'
import { findClienteById, updateCliente, deleteCliente } from '@/lib/database/clientes'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }
    
    const cliente = await findClienteById(id)
    
    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(cliente)
  } catch (error) {
    console.error('Erro ao buscar cliente:', error)
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
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }
    
    const body = await request.json()
    const { nome, cpf, telefone, email, endereco, numero, bairro, estado_fk, cidade_fk, cep, updated_by } = body
    
    const cliente = await updateCliente(id, {
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
      updated_by
    })
    
    return NextResponse.json(cliente)
  } catch (error: any) {
    console.error('Erro ao atualizar cliente:', error)
    
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }
    
    await deleteCliente(id)
    
    return NextResponse.json({ message: 'Cliente excluído com sucesso' })
  } catch (error: any) {
    console.error('Erro ao excluir cliente:', error)
    
    if (error.message === 'Cliente não encontrado') {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { findProprietarioById, updateProprietario, deleteProprietario } from '@/lib/database/proprietarios'

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
    
    const proprietario = await findProprietarioById(id)
    
    if (!proprietario) {
      return NextResponse.json(
        { error: 'Proprietário não encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(proprietario)
  } catch (error) {
    console.error('Erro ao buscar proprietário:', error)
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
    
    const proprietario = await updateProprietario(id, {
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
    
    return NextResponse.json(proprietario)
  } catch (error: any) {
    console.error('Erro ao atualizar proprietário:', error)
    
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
    
    await deleteProprietario(id)
    
    return NextResponse.json({ message: 'Proprietário excluído com sucesso' })
  } catch (error: any) {
    console.error('Erro ao excluir proprietário:', error)
    
    if (error.message === 'Proprietário não encontrado') {
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

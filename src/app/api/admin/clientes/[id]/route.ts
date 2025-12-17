import { NextRequest, NextResponse } from 'next/server'
import { findClienteByUuid, updateClienteByUuid, deleteClienteByUuid } from '@/lib/database/clientes'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'

const uuidRegex =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

function isValidUuid(value: string): boolean {
  return uuidRegex.test(value)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log(`🔍 [API CLIENTES GET] Recebido ID:`, params.id)
    
    if (!isValidUuid(params.id)) {
      return NextResponse.json(
        { error: 'UUID inválido' },
        { status: 400 }
      )
    }

    const cliente = await findClienteByUuid(params.id)
    
    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }
    
    console.log(`✅ [API CLIENTES GET] Cliente encontrado:`, cliente.nome)
    
    return NextResponse.json(cliente)
  } catch (error) {
    console.error('❌ [API CLIENTES GET] Erro ao buscar cliente:', error)
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
    console.log(`📝 [API CLIENTES PUT] Recebido ID:`, params.id)
    
    if (!isValidUuid(params.id)) {
      return NextResponse.json(
        { error: 'UUID inválido' },
        { status: 400 }
      )
    }
    
    console.log(`📝 [API CLIENTES PUT] Atualizando por UUID`)
    const clienteAtual = await findClienteByUuid(params.id)
    if (!clienteAtual) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { nome, cpf, telefone, email, endereco, numero, bairro, complemento, estado_fk, cidade_fk, cep, updated_by } = body
    
    // Validação de campos obrigatórios
    if (!nome || !cpf || !telefone || !email || !estado_fk || !cidade_fk || !endereco || !bairro || !numero) {
      return NextResponse.json(
        { error: 'Nome, CPF, telefone, email, estado, cidade, endereço, bairro e número são obrigatórios' },
        { status: 400 }
      )
    }
    
    // Buscar dados antigos para auditoria
    const cliente = await updateClienteByUuid(params.id, {
      nome,
      cpf,
      telefone,
      email,
      endereco,
      numero,
      bairro,
      complemento,
      estado_fk: estado_fk || undefined,
      cidade_fk: cidade_fk || undefined,
      cep,
      updated_by
    })
    
    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'UPDATE',
        resource: 'clientes',
        resourceId: cliente.uuid,
        details: {
          nome: cliente.nome,
          cpf: cliente.cpf,
          email: cliente.email,
          telefone: cliente.telefone,
          changes: {
            nome: clienteAtual.nome !== cliente.nome ? { from: clienteAtual.nome, to: cliente.nome } : undefined,
            cpf: clienteAtual.cpf !== cliente.cpf ? { from: clienteAtual.cpf, to: cliente.cpf } : undefined,
            email: clienteAtual.email !== cliente.email ? { from: clienteAtual.email, to: cliente.email } : undefined,
            telefone: clienteAtual.telefone !== cliente.telefone ? { from: clienteAtual.telefone, to: cliente.telefone } : undefined
          }
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      // Log do erro mas não falha a operação principal
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }
    
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
    console.log(`🗑️ [API CLIENTES DELETE] Recebido ID:`, params.id)
    
    if (!isValidUuid(params.id)) {
      return NextResponse.json(
        { error: 'UUID inválido' },
        { status: 400 }
      )
    }
    
    console.log(`🗑️ [API CLIENTES DELETE] Deletando por UUID`)
    const cliente = await findClienteByUuid(params.id)
    if (!cliente) {
      return NextResponse.json(
        { error: 'Cliente não encontrado' },
        { status: 404 }
      )
    }
    
    await deleteClienteByUuid(params.id)
    
    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'DELETE',
        resource: 'clientes',
        resourceId: cliente.uuid,
        details: {
          nome: cliente.nome,
          cpf: cliente.cpf,
          email: cliente.email,
          telefone: cliente.telefone,
          deleted_at: new Date().toISOString()
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      // Log do erro mas não falha a operação principal
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }
    
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

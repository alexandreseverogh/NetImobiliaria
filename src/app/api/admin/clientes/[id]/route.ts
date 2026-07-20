import { NextRequest, NextResponse } from 'next/server'
import { findClienteByUuid, updateClienteByUuid, deleteClienteByUuid } from '@/lib/database/clientes'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'
import { requireApiPermission } from '@/lib/auth/apiPermissions'
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
    if (!isValidUuid(params.id)) {
      return NextResponse.json({ error: 'UUID inválido' }, { status: 400 })
    }

    // Obter tenantId do token
    const token = getTokenFromRequest(request)
    const decoded = token ? await verifyToken(token) : null
    const tenantId = decoded?.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 })
    }

    const cliente = await findClienteByUuid(params.id)
    
    // Validar se o cliente pertence ao tenant logado
    if (cliente && cliente.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Acesso negado: Cliente pertence a outra empresa' }, { status: 403 })
    }
    
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
    if (!isValidUuid(params.id)) {
      return NextResponse.json({ error: 'UUID inválido' }, { status: 400 })
    }

    // Verificar permissão de edição server-side
    const denied = await requireApiPermission(request, 'clientes', 'UPDATE')
    if (denied) return denied

    // Obter tenantId do token
    const token = getTokenFromRequest(request)
    const decoded = token ? await verifyToken(token) : null
    const tenantId = decoded?.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 })
    }

    const clienteAtual = await findClienteByUuid(params.id)
    if (!clienteAtual || clienteAtual.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Cliente não encontrado ou acesso negado' }, { status: 404 })
    }

    const body = await request.json()
    const { nome, cpf, telefone, email, endereco, numero, bairro, complemento, estado_fk, cidade_fk, cep, updated_by, tipo_cliente } = body
    const tipoClienteValido = (['conta_gerenciada', 'comprador_pj', 'consumidor_pf'] as const)
      .find(t => t === tipo_cliente)
    
    // Validação de campos obrigatórios
    if (!nome || !cpf || !telefone || !email || !estado_fk || !cidade_fk || !endereco || !bairro || !numero) {
      return NextResponse.json(
        { error: 'Nome, CPF, telefone, email, estado, cidade, endereço, bairro e número são obrigatórios' },
        { status: 400 }
      )
    }
    
    // Atualizar usando tenantId para segurança extra
    const cliente = await updateClienteByUuid(params.id, tenantId, {
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
      tipo_cliente: tipoClienteValido,
      updated_by
    })
    
    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        tenantId,
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
    if (!isValidUuid(params.id)) {
      return NextResponse.json({ error: 'UUID inválido' }, { status: 400 })
    }

    // Verificar permissão de exclusão server-side
    const denied = await requireApiPermission(request, 'clientes', 'DELETE')
    if (denied) return denied

    // Obter tenantId do token
    const token = getTokenFromRequest(request)
    const decoded = token ? await verifyToken(token) : null
    const tenantId = decoded?.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 })
    }

    const cliente = await findClienteByUuid(params.id)
    if (!cliente || cliente.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Cliente não encontrado ou acesso negado' }, { status: 404 })
    }
    
    await deleteClienteByUuid(params.id, tenantId)
    
    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        tenantId,
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

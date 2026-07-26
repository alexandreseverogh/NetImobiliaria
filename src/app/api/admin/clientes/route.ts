import { NextRequest, NextResponse } from 'next/server'
import { findClientesPaginated, createCliente } from '@/lib/database/clientes'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'
import { requireApiPermission } from '@/lib/auth/apiPermissions'
import { createValidator } from '@/lib/validation/unifiedValidation'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'

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
    const tipoClienteParam = searchParams.get('tipo_cliente') || undefined
    const tipo_cliente = (['conta_gerenciada', 'comprador_pj', 'consumidor_pf'] as const)
      .find(t => t === tipoClienteParam)

    // Obter tenantId do token
    const token = getTokenFromRequest(request)
    const decoded = token ? await verifyToken(token) : null
    const tenantId = decoded?.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 })
    }

    const result = await findClientesPaginated(page, limit, {
      nome,
      cpf,
      estado,
      cidade,
      bairro,
      tipo_cliente,
      tenant_id: tenantId
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

export async function POST(request: NextRequest) {
  try {
    // Verificar permissão de criação server-side
    const denied = await requireApiPermission(request, 'clientes', 'CREATE')
    if (denied) return denied

    // Obter tenantId do token
    const token = getTokenFromRequest(request)
    const decoded = token ? await verifyToken(token) : null
    const tenantId = decoded?.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 })
    }

    const body = await request.json()
    const { nome, cpf, telefone, email, endereco, numero, bairro, estado_fk, cidade_fk, cep, created_by, tipo_cliente } = body
    const tipoClienteValido = (['conta_gerenciada', 'comprador_pj', 'consumidor_pf'] as const)
      .find(t => t === tipo_cliente)
    
    // Validação temporariamente desabilitada para testar IP
    // const validator = createValidator('clients', '/api/admin/clientes')
    // const validation = await validator.validateAndLog(
    //   body,
    //   request.ip || 'unknown',
    //   request.headers.get('user-agent') || 'unknown'
    // )
    
    // if (!validation.isValid) {
    //   return NextResponse.json(
    //     { 
    //       error: 'Dados inválidos',
    //       details: validation.errors 
    //     },
    //     { status: 400 }
    //   )
    // }
    
    if (!nome || !cpf || !telefone || !email || !estado_fk || !cidade_fk || !endereco || !bairro || !numero) {
      return NextResponse.json(
        { error: 'Nome, CPF, telefone, email, estado, cidade, endereço, bairro e número são obrigatórios' },
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
      origem_cadastro: 'Plataforma',
      tipo_cliente: tipoClienteValido || 'conta_gerenciada',
      created_by: created_by || 'system',
      tenant_id: tenantId
    })
    
    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        tenantId,
        action: 'CREATE',
        resource: 'clientes',
        resourceId: cliente.uuid,
        details: {
          nome: cliente.nome,
          cpf: cliente.cpf,
          email: cliente.email,
          telefone: cliente.telefone
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      // Log do erro mas não falha a operação principal
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }
    
    return NextResponse.json(cliente, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar cliente:', error)
    
    // Bug real corrigido: createCliente lança 'CPF já cadastrado nesta imobiliária'/'Email já
    // cadastrado nesta imobiliária' (com sufixo), mas esta checagem comparava com a string sem
    // sufixo — nunca batia, e a validação (foreseeable, não uma falha de infra) sempre caía no
    // 500 genérico abaixo. Usa startsWith pra não depender de manter os textos idênticos.
    if (error.message?.startsWith('CPF já cadastrado') || error.message?.startsWith('Email já cadastrado') || error.message === 'CPF Inválido') {
      return NextResponse.json(
        { error: error.message },
        { status: error.message === 'CPF Inválido' ? 400 : 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

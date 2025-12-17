import { NextRequest, NextResponse } from 'next/server'
import { findClientesPaginated, createCliente } from '@/lib/database/clientes'
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nome, cpf, telefone, email, endereco, numero, bairro, estado_fk, cidade_fk, cep, created_by } = body
    
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
      created_by: created_by || 'system'
    })
    
    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
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

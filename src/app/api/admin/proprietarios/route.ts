import { NextRequest, NextResponse } from 'next/server'
import { createValidator } from '@/lib/validation/unifiedValidation'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'
import { findProprietariosPaginated, createProprietario } from '@/lib/database/proprietarios'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

export async function GET(request: NextRequest) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const nome = searchParams.get('nome') || undefined
    const cpf = searchParams.get('cpf') || undefined
    const estado = searchParams.get('estado') || undefined
    const cidade = searchParams.get('cidade') || undefined
    const bairro = searchParams.get('bairro') || undefined

    const result = await findProprietariosPaginated(page, limit, {
      nome,
      cpf,
      estado,
      cidade,
      bairro
    })

    return NextResponse.json({ success: true, ...result })

  } catch (error) {
    console.error('❌ Erro ao buscar proprietários:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Erro interno do servidor ao buscar proprietários' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const body = await request.json()
    const { nome, cpf, telefone, email, endereco, numero, bairro, estado_fk, cidade_fk, cep, created_by } = body
    
    // Validação temporariamente desabilitada para testar auditoria
    // const validator = createValidator('owners', '/api/admin/proprietarios')
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
    
    const proprietario = await createProprietario({
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
        resource: 'proprietarios',
        resourceId: proprietario.uuid,
        details: {
          nome: proprietario.nome,
          cpf: proprietario.cpf,
          email: proprietario.email,
          telefone: proprietario.telefone
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      // Log do erro mas não falha a operação principal
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }
    
    return NextResponse.json(proprietario, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar proprietário:', error)
    
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
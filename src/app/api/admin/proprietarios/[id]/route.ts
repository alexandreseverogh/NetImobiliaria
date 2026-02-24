import { NextRequest, NextResponse } from 'next/server'
import {
  findProprietarioByUuid,
  updateProprietarioByUuid,
  deleteProprietarioByUuid
} from '@/lib/database/proprietarios'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/

function isValidUuid(value: string): boolean {
  return uuidRegex.test(value)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    if (!isValidUuid(params.id)) {
      return NextResponse.json(
        { error: 'Identificador inválido. Utilize o UUID do proprietário.' },
        { status: 400 }
      )
    }

    const proprietario = await findProprietarioByUuid(params.id)

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
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    if (!isValidUuid(params.id)) {
      return NextResponse.json(
        { error: 'Identificador inválido. Utilize o UUID do proprietário.' },
        { status: 400 }
      )
    }

    const proprietarioAtual = await findProprietarioByUuid(params.id)

    if (!proprietarioAtual) {
      return NextResponse.json(
        { error: 'Proprietário não encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { nome, cpf, cnpj, telefone, email, endereco, numero, bairro, complemento, estado_fk, cidade_fk, cep, updated_by } = body

    // Validação de campos obrigatórios
    if (!nome || (!cpf && !cnpj) || !telefone || !email || !estado_fk || !cidade_fk || !endereco || !bairro || !numero) {
      return NextResponse.json(
        { error: 'Nome, CPF ou CNPJ, telefone, email, estado, cidade, endereço, bairro e número são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar dados antigos para auditoria
    const proprietario = await updateProprietarioByUuid(params.id, {
      nome,
      cpf: cpf || undefined,
      cnpj: cnpj || undefined,
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
    }, true)

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)

      await logAuditEvent({
        userId,
        action: 'UPDATE',
        resource: 'proprietarios',
        resourceId: proprietario.uuid,
        details: {
          nome: proprietario.nome,
          cpf: proprietario.cpf,
          email: proprietario.email,
          telefone: proprietario.telefone,
          changes: {
            nome: proprietarioAtual.nome !== proprietario.nome ? { from: proprietarioAtual.nome, to: proprietario.nome } : undefined,
            cpf: proprietarioAtual.cpf !== proprietario.cpf ? { from: proprietarioAtual.cpf, to: proprietario.cpf } : undefined,
            email: proprietarioAtual.email !== proprietario.email ? { from: proprietarioAtual.email, to: proprietario.email } : undefined,
            telefone: proprietarioAtual.telefone !== proprietario.telefone ? { from: proprietarioAtual.telefone, to: proprietario.telefone } : undefined
          }
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      // Log do erro mas não falha a operação principal
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }

    return NextResponse.json(proprietario)
  } catch (error: any) {
    console.error('Erro ao atualizar proprietário:', error)

    if (error.message === 'CPF já cadastrado' || error.message === 'CNPJ já cadastrado' || error.message === 'Email já cadastrado') {
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
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    if (!isValidUuid(params.id)) {
      return NextResponse.json(
        { error: 'Identificador inválido. Utilize o UUID do proprietário.' },
        { status: 400 }
      )
    }

    const proprietario = await findProprietarioByUuid(params.id)

    if (!proprietario) {
      return NextResponse.json(
        { error: 'Proprietário não encontrado' },
        { status: 404 }
      )
    }

    await deleteProprietarioByUuid(params.id)

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)

      await logAuditEvent({
        userId,
        action: 'DELETE',
        resource: 'proprietarios',
        resourceId: proprietario.uuid,
        details: {
          nome: proprietario.nome,
          cpf: proprietario.cpf,
          email: proprietario.email,
          telefone: proprietario.telefone,
          deleted_at: new Date().toISOString()
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      // Log do erro mas não falha a operação principal
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }

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

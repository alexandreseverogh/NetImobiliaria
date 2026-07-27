import { NextRequest, NextResponse } from 'next/server'
import { findProprietarioByUuid, updateProprietarioByUuid, deleteProprietarioByUuid } from '@/lib/database/proprietarios'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import pool from '@/lib/database/connection'
import { requireApiPermission } from '@/lib/auth/apiPermissions'

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
      return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })
    }

    // Obter tenantId do token
    const token = getTokenFromRequest(request)
    const decoded = token ? await verifyToken(token) : null
    const tenantId = decoded?.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 })
    }

    const proprietario = await findProprietarioByUuid(params.id)

    // Validar se o proprietário pertence ao tenant logado
    if (proprietario && proprietario.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Acesso negado: Proprietário pertence a outra empresa' }, { status: 403 })
    }

    if (!proprietario) {
      return NextResponse.json(
        { error: 'Proprietário não encontrado' },
        { status: 404 }
      )
    }

    if (proprietario) {
      const { semantic_data, ...baseData } = proprietario as any;
      return NextResponse.json({
        ...baseData,
        ...(semantic_data || {})
      });
    }

    return NextResponse.json(proprietario);
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
    const denied = await requireApiPermission(request, 'proprietarios', 'UPDATE')
    if (denied) return denied

    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    if (!isValidUuid(params.id)) {
      return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })
    }

    // Obter tenantId do token
    const token = getTokenFromRequest(request)
    const decoded = token ? await verifyToken(token) : null
    const tenantId = decoded?.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 })
    }

    const proprietarioAtual = await findProprietarioByUuid(params.id)

    if (!proprietarioAtual || proprietarioAtual.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Proprietário não encontrado ou acesso negado' }, { status: 404 })
    }

    const body = await request.json()
    const { nome, cpf, cnpj, telefone, email, endereco, numero, bairro, complemento, estado_fk, cidade_fk, cep, updated_by, ...rest } = body

    // Buscar Configuração Semântica para identificar o que salvar no JSONB
    const configRes = await pool.query(`
      SELECT semantic_mapping 
      FROM system_features 
      WHERE slug = 'proprietarios'
    `);
    const mapping = configRes.rows[0]?.semantic_mapping || [];
    const semantic_data: Record<string, any> = { ... (proprietarioAtual.semantic_data || {}) };

    // Mapear campos dinâmicos (exceto os que têm coluna física)
    const physicalColumns = ['corretor_fk'];
    mapping.forEach((m: any) => {
      if (m.field && !physicalColumns.includes(m.field) && body[m.field] !== undefined) {
        semantic_data[m.field] = body[m.field];
      }
    });

    // Validação de campos obrigatórios
    if (!nome || (!cpf && !cnpj) || !telefone || !email || !estado_fk || !cidade_fk || !endereco || !bairro || !numero) {
      return NextResponse.json(
        { error: 'Nome, CPF ou CNPJ, telefone, email, estado, cidade, endereço, bairro e número são obrigatórios' },
        { status: 400 }
      )
    }

    // Atualizar usando tenantId para segurança extra
    const proprietario = await updateProprietarioByUuid(params.id, tenantId, {
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
      updated_by,
      semantic_data
    }, true)
    
    console.log('✅ Proprietário atualizado com sucesso:', proprietario.uuid)

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)

      await logAuditEvent({
        userId,
        tenantId,
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
    console.error('❌ ERRO CRÍTICO NO PUT /api/admin/proprietarios/[id]:', error)
    console.error('Stack Trace:', error.stack)

    if (
      error.message?.startsWith('CPF já cadastrado') ||
      error.message?.startsWith('CNPJ já cadastrado') ||
      error.message?.startsWith('Email já cadastrado')
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 409 }
      )
    }

    if (
      error.message === 'CPF Inválido' ||
      error.message === 'CNPJ Inválido' ||
      error.message === 'CPF ou CNPJ deve ser informado'
    ) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
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
    const denied = await requireApiPermission(request, 'proprietarios', 'DELETE')
    if (denied) return denied

    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    if (!isValidUuid(params.id)) {
      return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })
    }

    // Obter tenantId do token
    const token = getTokenFromRequest(request)
    const decoded = token ? await verifyToken(token) : null
    const tenantId = decoded?.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 })
    }

    const proprietario = await findProprietarioByUuid(params.id)

    if (!proprietario || proprietario.tenant_id !== tenantId) {
      return NextResponse.json({ error: 'Proprietário não encontrado ou acesso negado' }, { status: 404 })
    }

    await deleteProprietarioByUuid(params.id, tenantId)

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)

      await logAuditEvent({
        userId,
        tenantId,
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

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { safeParseInt } from '@/lib/utils/safeParser'
import { createValidator } from '@/lib/validation/unifiedValidation'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'
import { findProprietariosPaginated, createProprietario } from '@/lib/database/proprietarios'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'
import { requireApiPermission } from '@/lib/auth/apiPermissions'

export async function GET(request: NextRequest) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const { searchParams } = new URL(request.url)
    const page = safeParseInt(searchParams.get('page'), 1, 1)
    const limit = safeParseInt(searchParams.get('limit'), 10, 1, 100)

    const nome = searchParams.get('nome') || undefined
    const cpf = searchParams.get('cpf') || undefined
    const cnpj = searchParams.get('cnpj') || undefined
    const estado = searchParams.get('estado') || undefined
    const cidade = searchParams.get('cidade') || undefined
    const bairro = searchParams.get('bairro') || undefined
    const mineCorretor = (searchParams.get('mine_corretor') || '').toLowerCase() === 'true'

    // Obter tenantId do token para isolamento
    const token = getTokenFromRequest(request)
    const decodedToken: any = token ? await verifyToken(token) : null
    const tenantId = decodedToken?.tenantId

    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Tenant não identificado' }, { status: 401 })
    }

    let corretor_fk: string | undefined = undefined
    if (mineCorretor) {
      // Usar os dados já decodificados
      const requesterUserId = decodedToken?.userId || null
      const roleName = String(decodedToken?.role_name || decodedToken?.cargo || '').toLowerCase()

      if (!requesterUserId) {
        return NextResponse.json({ success: false, error: 'Token inválido ou expirado' }, { status: 401 })
      }

      if (!roleName.includes('corretor')) {
        return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
      }

      corretor_fk = requesterUserId
    }

    const result = await findProprietariosPaginated(page, limit, {
      nome,
      cpf,
      cnpj,
      estado,
      cidade,
      bairro,
      corretor_fk,
      tenant_id: tenantId
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
    const denied = await requireApiPermission(request, 'proprietarios', 'CREATE')
    if (denied) return denied

    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    // Obter tenantId do token
    const token = getTokenFromRequest(request)
    const decodedToken: any = token ? await verifyToken(token) : null
    const tenantId = decodedToken?.tenantId

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant não identificado' }, { status: 401 })
    }

    const body = await request.json()
    const { nome, cpf, cnpj, telefone, email, endereco, numero, bairro, complemento, estado_fk, cidade_fk, cep, created_by, corretor_fk: body_corretor_fk, ...rest } = body

    // 2. Buscar Configuração Semântica para extrair campos dinâmicos
    const configRes = await pool.query(`
      SELECT semantic_mapping 
      FROM system_features 
      WHERE slug = 'proprietarios'
    `);
    const mapping = configRes.rows[0]?.semantic_mapping || [];
    const semantic_data: Record<string, any> = {};

    // Mover campos que estão no mapping para o semantic_data (exceto os que já têm coluna física)
    const physicalColumns = ['corretor_fk']; // Adicione outros se necessário
    mapping.forEach((m: any) => {
      if (m.field && !physicalColumns.includes(m.field) && body[m.field] !== undefined) {
        semantic_data[m.field] = body[m.field];
      }
    });

    let corretor_fk: string | null = body_corretor_fk || null
    let requesterUserId: string | null = null
    try {
      if (token) {
        requesterUserId = decodedToken?.userId || null
        const roleName = String(decodedToken?.role_name || decodedToken?.cargo || '').toLowerCase()
        const userType = String(decodedToken?.userType || '').toLowerCase()

        // Se for corretor, FORÇA o vínculo com ele mesmo (impede que um corretor crie proprietário para outro)
        if (requesterUserId && (roleName.includes('corretor') || userType === 'corretor')) {
          corretor_fk = requesterUserId
        }
        // Se for admin, o corretor_fk já foi extraído de body_corretor_fk
      }
    } catch {
      // Se falhar, não quebra o fluxo de criação (o middleware já validou auth/permissão).
    }

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

    if (!nome || (!cpf && !cnpj) || !telefone || !email || !estado_fk || !cidade_fk || !endereco || !bairro || !numero) {
      return NextResponse.json(
        { error: 'Nome, CPF ou CNPJ, telefone, email, estado, cidade, endereço, bairro e número são obrigatórios' },
        { status: 400 }
      )
    }

    const proprietario = await createProprietario({
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
      origem_cadastro: 'Plataforma',
      created_by: requesterUserId || created_by || 'system',
      corretor_fk,
      tenant_id: tenantId,
      semantic_data,
      // Quando o proprietário é cadastrado via acesso do corretor, a senha padrão deve ser "Proprietario"
      ...(corretor_fk ? { password: 'Proprietario' } : {})
    }, true) // Passando isAdmin = true para permitir CPF fake

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)

      await logAuditEvent({
        userId,
        tenantId,
        action: 'CREATE',
        resource: 'proprietarios',
        resourceId: proprietario.uuid,
        details: {
          nome: proprietario.nome,
          cpf: proprietario.cpf,
          cnpj: proprietario.cnpj,
          email: proprietario.email,
          telefone: proprietario.telefone,
          corretor_fk: (proprietario as any).corretor_fk || null
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
    console.error('❌ ERRO CRÍTICO NO POST /api/admin/proprietarios:', error)
    console.error('Stack Trace:', error.stack)

    // startsWith em vez de === — mesmo bug já corrigido em /api/admin/clientes: comparar a
    // mensagem exata é frágil (bastou o texto de createProprietario mudar levemente pra essa
    // checagem parar de bater e o erro, foreseeable, cair sempre no 500 genérico abaixo).
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
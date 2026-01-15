import { NextRequest, NextResponse } from 'next/server'
import { createValidator } from '@/lib/validation/unifiedValidation'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'
import { findProprietariosPaginated, createProprietario } from '@/lib/database/proprietarios'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { verifyToken } from '@/lib/auth/jwt'

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
    const mineCorretor = (searchParams.get('mine_corretor') || '').toLowerCase() === 'true'

    let corretor_fk: string | undefined = undefined
    if (mineCorretor) {
      try {
        // Quando mine_corretor=true, NUNCA retornar lista sem filtro.
        // Se não conseguirmos identificar o corretor pelo token, falhar.
        const authHeader = request.headers.get('authorization') || ''
        const token =
          authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : request.cookies.get('accessToken')?.value || null

        if (!token) {
          return NextResponse.json({ success: false, error: 'Autenticação necessária' }, { status: 401 })
        }

        const decoded: any = await verifyToken(token)
        const requesterUserId = decoded?.userId || null
        const roleName = String(decoded?.role_name || decoded?.cargo || '').toLowerCase()

        if (!requesterUserId) {
          return NextResponse.json({ success: false, error: 'Token inválido ou expirado' }, { status: 401 })
        }

        if (!roleName.includes('corretor')) {
          return NextResponse.json({ success: false, error: 'Acesso negado' }, { status: 403 })
        }

        corretor_fk = requesterUserId
      } catch (e) {
        console.error('❌ Erro ao aplicar filtro mine_corretor:', e)
        return NextResponse.json({ success: false, error: 'Token inválido ou expirado' }, { status: 401 })
      }
    }

    const result = await findProprietariosPaginated(page, limit, {
      nome,
      cpf,
      estado,
      cidade,
      bairro,
      corretor_fk
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

    // Se quem está criando for um Corretor (login via modal público), gravar corretor_fk automaticamente.
    // (Não confiamos em payload do cliente para esse campo.)
    let corretor_fk: string | null = null
    let requesterUserId: string | null = null
    try {
      const authHeader = request.headers.get('authorization') || ''
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
      if (token) {
        const decoded: any = await verifyToken(token)
        requesterUserId = decoded?.userId || null
        const roleName = String(decoded?.role_name || decoded?.cargo || '').toLowerCase()
        const userType = String(decoded?.userType || '').toLowerCase()

        // Robust check: include all variations of broker roles found in the DB/Logic
        if (requesterUserId && (
          roleName.includes('corretor') ||
          userType === 'corretor' ||
          roleName === 'admin' // Admins creating on behalf of themselves as brokers? Unlikely but safe to check.
        )) {
          // Se for corretor, FORÇA o vínculo com ele mesmo
          if (roleName.includes('corretor') || userType === 'corretor') {
            corretor_fk = requesterUserId
          }
        }
      }
    } catch {
      // Se falhar, não quebra o fluxo de criação (o middleware já validou auth/permissão).
      corretor_fk = null
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
      created_by: requesterUserId || created_by || 'system',
      corretor_fk,
      // Quando o proprietário é cadastrado via acesso do corretor, a senha padrão deve ser "Proprietario"
      ...(corretor_fk ? { password: 'Proprietario' } : {})
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
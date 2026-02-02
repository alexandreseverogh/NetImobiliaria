import { NextRequest, NextResponse } from 'next/server'
import { findAllStatusImovel, createStatusImovel, findStatusImovelPaginated } from '@/lib/database/status-imovel'
import { PAGINATION_CONFIG } from '@/lib/config/constants'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'
import { safeParseInt } from '@/lib/utils/safeParser'

// GET - Listar status de imóvel
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
    const search = searchParams.get('search') || ''

    // Se não há parâmetros de paginação, usar a função antiga para compatibilidade
    if (!searchParams.has('page') && !searchParams.has('limit')) {
      const statusImovel = await findAllStatusImovel()
      return NextResponse.json(statusImovel)
    }

    // Usar paginação
    const result = await findStatusImovelPaginated(page, limit, search)

    return NextResponse.json({
      success: true,
      statusImovel: result.statusImovel,
      total: result.total,
      totalPages: result.totalPages,
      currentPage: result.currentPage,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev
    })
  } catch (error) {
    console.error('Erro ao listar status de imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar novo status de imóvel
export async function POST(request: NextRequest) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const body = await request.json()
    const { nome, cor, descricao, ativo, consulta_imovel_internauta } = body

    if (!nome) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }

    const novoStatusImovel = await createStatusImovel({
      nome,
      cor: cor || '#3B82F6',
      descricao: descricao || '',
      ativo: ativo !== undefined ? ativo : true,
      consulta_imovel_internauta: consulta_imovel_internauta !== undefined ? consulta_imovel_internauta : true
    })

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)

      await logAuditEvent({
        userId,
        action: 'CREATE',
        resource: 'status-imovel',
        resourceId: novoStatusImovel.id,
        details: {
          nome: novoStatusImovel.nome,
          cor: novoStatusImovel.cor,
          descricao: novoStatusImovel.descricao,
          ativo: novoStatusImovel.ativo,
          consulta_imovel_internauta: novoStatusImovel.consulta_imovel_internauta
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }

    return NextResponse.json({
      success: true,
      data: novoStatusImovel
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar status de imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

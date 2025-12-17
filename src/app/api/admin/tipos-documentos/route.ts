import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { auditLogger } from '@/lib/utils/auditLogger'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'
import { 
  findTiposDocumentos, 
  findTiposDocumentosPaginated,
  createTipoDocumento, 
  CreateTipoDocumentoData 
} from '@/lib/database/tipo-documentos'

// GET - Listar tipos de documentos
export async function GET(request: NextRequest) {
  try {
    // Verificação de permissão usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck
    
    console.log('🔍 API: Carregando tipos de documentos...')

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    
    // Se não há parâmetros de paginação, usar a função antiga para compatibilidade
    if (!searchParams.has('page') && !searchParams.has('limit')) {
      const tiposDocumentos = await findTiposDocumentos()
      return NextResponse.json({
        success: true,
        tiposDocumentos,
        total: tiposDocumentos.length,
        totalPages: 1,
        currentPage: 1,
        hasNext: false,
        hasPrev: false
      })
    }
    
    // Usar paginação
    const result = await findTiposDocumentosPaginated(page, limit, search)
    
    console.log('✅ API: Tipos de documentos carregados:', result.tiposDocumentos.length)

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('Erro ao listar tipos de documentos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Criar tipo de documento
export async function POST(request: NextRequest) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const data: CreateTipoDocumentoData = await request.json()

    // Validação básica
    if (!data.descricao || data.descricao.trim().length === 0) {
      return NextResponse.json(
        { error: 'Descrição é obrigatória' },
        { status: 400 }
      )
    }

    if (data.descricao.trim().length < 2) {
      return NextResponse.json(
        { error: 'Descrição deve ter pelo menos 2 caracteres' },
        { status: 400 }
      )
    }

    // Criar tipo de documento
    const novoTipoDocumento = await createTipoDocumento({
      descricao: data.descricao.trim(),
      consulta_imovel_internauta: data.consulta_imovel_internauta || false
    })

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'CREATE',
        resource: 'tipos-documentos',
        resourceId: novoTipoDocumento.id,
        details: {
          descricao: novoTipoDocumento.descricao,
          consulta_imovel_internauta: novoTipoDocumento.consulta_imovel_internauta,
          ativo: novoTipoDocumento.ativo
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      // Log do erro mas não falha a operação principal
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }

    return NextResponse.json({
      success: true,
      message: 'Tipo de documento criado com sucesso',
      tipoDocumento: novoTipoDocumento
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar tipo de documento:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Já existe um tipo de documento')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

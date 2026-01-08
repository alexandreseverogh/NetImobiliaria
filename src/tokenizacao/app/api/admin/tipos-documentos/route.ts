/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { checkApiPermission } from '@/lib/middleware/permissionMiddleware'
import { auditLogger } from '@/lib/utils/auditLogger'
import { 
  findTiposDocumentos, 
  findTiposDocumentosPaginated,
  createTipoDocumento, 
  CreateTipoDocumentoData 
} from '@/lib/database/tipo-documentos'

// GET - Listar tipos de documentos
export async function GET(request: NextRequest) {
  try {
    console.log('ðŸ” API: Carregando tipos de documentos...')

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    
    // Se nÃ£o hÃ¡ parÃ¢metros de paginaÃ§Ã£o, usar a funÃ§Ã£o antiga para compatibilidade
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
    
    // Usar paginaÃ§Ã£o
    const result = await findTiposDocumentosPaginated(page, limit, search)
    
    console.log('âœ… API: Tipos de documentos carregados:', result.tiposDocumentos.length)

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
    // Verificar permissÃµes
    const permissionCheck = await checkApiPermission(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const data: CreateTipoDocumentoData = await request.json()

    // ValidaÃ§Ã£o bÃ¡sica
    if (!data.descricao || data.descricao.trim().length === 0) {
      return NextResponse.json(
        { error: 'DescriÃ§Ã£o Ã© obrigatÃ³ria' },
        { status: 400 }
      )
    }

    if (data.descricao.trim().length < 2) {
      return NextResponse.json(
        { error: 'DescriÃ§Ã£o deve ter pelo menos 2 caracteres' },
        { status: 400 }
      )
    }

    // Criar tipo de documento
    const novoTipoDocumento = await createTipoDocumento({
      descricao: data.descricao.trim(),
      consulta_imovel_internauta: data.consulta_imovel_internauta || false
    })

    // Log de auditoria
    auditLogger.log(
      'TIPO_DOCUMENTO_CREATE',
      `UsuÃ¡rio criou tipo de documento: ${data.descricao}`,
      true,
      'system',
      'system',
      request.ip || 'unknown'
    )

    return NextResponse.json({
      success: true,
      message: 'Tipo de documento criado com sucesso',
      tipoDocumento: novoTipoDocumento
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao criar tipo de documento:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('JÃ¡ existe um tipo de documento')) {
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


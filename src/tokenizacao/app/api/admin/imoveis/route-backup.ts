/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'

// ForÃ§ar uso do Node.js runtime
export const runtime = 'nodejs'

import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { listImoveis, getImoveisStats, createImovel, findAllImoveis } from '@/lib/database/imoveis'
import { userHasPermission } from '@/lib/database/users'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticaÃ§Ã£o
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticaÃ§Ã£o nÃ£o fornecido' },
        { status: 401 }
      )
    }

    const decoded = verifyTokenNode(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token invÃ¡lido' },
        { status: 401 }
      )
    }

    // Verificar permissÃ£o de leitura
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'READ')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissÃ£o para acessar imÃ³veis' },
        { status: 403 }
      )
    }

    // Extrair parÃ¢metros da query
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    
    // Se nÃ£o houver parÃ¢metros de paginaÃ§Ã£o, retornar todos os imÃ³veis
    if (!page && !limit) {
      const imoveis = await findAllImoveis()
      return NextResponse.json({
        success: true,
        data: imoveis
      })
    }
    
    // Caso contrÃ¡rio, usar paginaÃ§Ã£o
    const pageNum = parseInt(page || '1')
    const limitNum = parseInt(limit || '20')
    const offset = (pageNum - 1) * limitNum

    // Filtros
    const filtros: any = {}
    
    if (searchParams.get('tipo_id')) {
      filtros.tipo_id = parseInt(searchParams.get('tipo_id')!)
    }
    
    if (searchParams.get('status_id')) {
      filtros.status_id = parseInt(searchParams.get('status_id')!)
    }
    
    if (searchParams.get('preco_min')) {
      filtros.preco_min = parseFloat(searchParams.get('preco_min')!)
    }
    
    if (searchParams.get('preco_max')) {
      filtros.preco_max = parseFloat(searchParams.get('preco_max')!)
    }
    
    if (searchParams.get('quartos_min')) {
      filtros.quartos_min = parseInt(searchParams.get('quartos_min')!)
    }
    
    if (searchParams.get('area_min')) {
      filtros.area_min = parseFloat(searchParams.get('area_min')!)
    }
    
    if (searchParams.get('cidade')) {
      filtros.cidade = searchParams.get('cidade')
    }
    
    if (searchParams.get('bairro')) {
      filtros.bairro = searchParams.get('bairro')
    }
    
    if (searchParams.get('destaque') !== null) {
      filtros.destaque = searchParams.get('destaque') === 'true'
    }

    // Buscar imÃ³veis
    const imoveis = await listImoveis(filtros, limitNum, offset)
    
    // Buscar estatÃ­sticas para paginaÃ§Ã£o
    const stats = await getImoveisStats()
    const total = stats.total_imoveis || 0
    const totalPages = Math.ceil(total / limitNum)

    return NextResponse.json({
      success: true,
      data: {
        imoveis,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    })

  } catch (error) {
    console.error('Erro ao listar imÃ³veis:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticaÃ§Ã£o
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticaÃ§Ã£o nÃ£o fornecido' },
        { status: 401 }
      )
    }

    const decoded = verifyTokenNode(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token invÃ¡lido' },
        { status: 401 }
      )
    }

    // Verificar permissÃ£o de escrita
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'WRITE')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissÃ£o para criar imÃ³veis' },
        { status: 403 }
      )
    }

    // Validar dados do corpo
    const body = await request.json()
    
    console.log('ðŸ” Dados recebidos na API:', JSON.stringify(body, null, 2))
    
    if (!body.codigo || !body.titulo || !body.tipo_id || !body.status_id) {
      console.log('âŒ ValidaÃ§Ã£o falhou - campos obrigatÃ³rios:', {
        codigo: !!body.codigo,
        titulo: !!body.titulo,
        tipo_id: !!body.tipo_id,
        status_id: !!body.status_id
      })
      return NextResponse.json(
        { error: 'Campos obrigatÃ³rios: codigo, titulo, tipo_id, status_id' },
        { status: 400 }
      )
    }

    // Validar formato do cÃ³digo (deve ser Ãºnico)
    if (!/^[A-Z0-9]{3,10}$/.test(body.codigo)) {
      return NextResponse.json(
        { error: 'CÃ³digo deve ter 3-10 caracteres alfanumÃ©ricos maiÃºsculos' },
        { status: 400 }
      )
    }

    // Validar preÃ§o se fornecido
    if (body.preco && (body.preco <= 0 || body.preco > 999999999.99)) {
      return NextResponse.json(
        { error: 'PreÃ§o deve estar entre 0 e 999.999.999,99' },
        { status: 400 }
      )
    }

    // Validar Ã¡rea se fornecida
    if (body.area_total && (body.area_total <= 0 || body.area_total > 99999.99)) {
      return NextResponse.json(
        { error: 'Ãrea total deve estar entre 0 e 99.999,99' },
        { status: 400 }
      )
    }

    // Criar imÃ³vel
    const novoImovel = await createImovel(body, decoded.userId)

    return NextResponse.json({
      success: true,
      message: 'ImÃ³vel criado com sucesso',
      data: novoImovel
    }, { status: 201 })

  } catch (error: any) {
    console.error('âŒ Erro ao criar imÃ³vel:', error)
    console.error('âŒ Tipo do erro:', typeof error)
    console.error('âŒ CÃ³digo do erro:', error.code)
    console.error('âŒ Mensagem do erro:', error.message)
    console.error('âŒ Stack trace:', error.stack)
    
    // Verificar se Ã© erro de cÃ³digo duplicado
    if (error.code === '23505' && error.constraint === 'imoveis_codigo_key') {
      return NextResponse.json(
        { error: 'CÃ³digo de imÃ³vel jÃ¡ existe' },
        { status: 409 }
      )
    }

    // Retornar erro mais especÃ­fico para debug
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        details: error.message || 'Erro desconhecido',
        code: error.code || 'UNKNOWN'
      },
      { status: 500 }
    )
  }
}


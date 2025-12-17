import { NextRequest, NextResponse } from 'next/server'

// Forçar uso do Node.js runtime
export const runtime = 'nodejs'

import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { listImoveis, getImoveisStats, createImovel, findAllImoveis } from '@/lib/database/imoveis'
import { userHasPermission } from '@/lib/database/users'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const decoded = verifyTokenNode(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar permissão de leitura
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'READ')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para acessar imóveis' },
        { status: 403 }
      )
    }

    // Extrair parâmetros da query
    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page')
    const limit = searchParams.get('limit')
    
    // Se não houver parâmetros de paginação, retornar todos os imóveis
    if (!page && !limit) {
      const imoveis = await findAllImoveis()
      return NextResponse.json({
        success: true,
        data: imoveis
      })
    }
    
    // Caso contrário, usar paginação
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

    // Buscar imóveis
    const imoveis = await listImoveis(filtros, limitNum, offset)
    
    // Buscar estatísticas para paginação
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
    console.error('Erro ao listar imóveis:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const token = request.cookies.get('accessToken')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }

    const decoded = verifyTokenNode(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Verificar permissão de escrita
    const hasPermission = await userHasPermission(decoded.userId, 'imoveis', 'UPDATE')
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Sem permissão para criar imóveis' },
        { status: 403 }
      )
    }

    // Validar dados do corpo
    const body = await request.json()
    
    console.log('🔍 Dados recebidos na API:', JSON.stringify(body, null, 2))
    
    if (!body.codigo || !body.titulo || !body.tipo_id || !body.status_id) {
      console.log('❌ Validação falhou - campos obrigatórios:', {
        codigo: !!body.codigo,
        titulo: !!body.titulo,
        tipo_id: !!body.tipo_id,
        status_id: !!body.status_id
      })
      return NextResponse.json(
        { error: 'Campos obrigatórios: codigo, titulo, tipo_id, status_id' },
        { status: 400 }
      )
    }

    // Validar formato do código (deve ser único)
    if (!/^[A-Z0-9]{3,10}$/.test(body.codigo)) {
      return NextResponse.json(
        { error: 'Código deve ter 3-10 caracteres alfanuméricos maiúsculos' },
        { status: 400 }
      )
    }

    // Validar preço se fornecido
    if (body.preco && (body.preco <= 0 || body.preco > 999999999.99)) {
      return NextResponse.json(
        { error: 'Preço deve estar entre 0 e 999.999.999,99' },
        { status: 400 }
      )
    }

    // Validar área se fornecida
    if (body.area_total && (body.area_total <= 0 || body.area_total > 99999.99)) {
      return NextResponse.json(
        { error: 'Área total deve estar entre 0 e 99.999,99' },
        { status: 400 }
      )
    }

    // Criar imóvel
    const novoImovel = await createImovel(body, decoded.userId)

    return NextResponse.json({
      success: true,
      message: 'Imóvel criado com sucesso',
      data: novoImovel
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ Erro ao criar imóvel:', error)
    console.error('❌ Tipo do erro:', typeof error)
    console.error('❌ Código do erro:', error.code)
    console.error('❌ Mensagem do erro:', error.message)
    console.error('❌ Stack trace:', error.stack)
    
    // Verificar se é erro de código duplicado
    if (error.code === '23505' && error.constraint === 'imoveis_codigo_key') {
      return NextResponse.json(
        { error: 'Código de imóvel já existe' },
        { status: 409 }
      )
    }

    // Retornar erro mais específico para debug
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

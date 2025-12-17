import { NextRequest, NextResponse } from 'next/server'
import { findAllFinalidades, createFinalidade, findFinalidadesPaginated } from '@/lib/database/finalidades'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = searchParams.get('search') || ''
    
    if (!searchParams.has('page') && !searchParams.has('limit')) {
      const finalidades = await findAllFinalidades()
      return NextResponse.json(finalidades)
    }
    
    const result = await findFinalidadesPaginated(page, limit, search)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro ao listar finalidades:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nome, descricao, ativo, tipo_destaque, alugar_landpaging, vender_landpaging } = body
    
    if (!nome) {
      return NextResponse.json(
        { error: 'Nome é obrigatório' },
        { status: 400 }
      )
    }
    
    // Validar tipo_destaque (se fornecido)
    if (tipo_destaque !== undefined && tipo_destaque !== null) {
      const valoresPermitidos = ['DV', 'DA', '  ']
      if (!valoresPermitidos.includes(tipo_destaque)) {
        return NextResponse.json(
          { error: 'Tipo de destaque inválido. Valores permitidos: "DV", "DA", "  "' },
          { status: 400 }
        )
      }
    }
    
    const novaFinalidade = await createFinalidade({
      nome,
      descricao: descricao || '',
      ativo: ativo !== undefined ? ativo : true,
      tipo_destaque: tipo_destaque || '  ',
      alugar_landpaging: alugar_landpaging !== undefined ? alugar_landpaging : false,
      vender_landpaging: vender_landpaging !== undefined ? vender_landpaging : false
    })
    
    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request as NextRequest)
      const userId = extractUserIdFromToken(request as NextRequest)
      
      await logAuditEvent({
        userId,
        action: 'CREATE',
        resource: 'finalidades',
        resourceId: novaFinalidade.id,
        details: {
          nome: novaFinalidade.nome,
          descricao: novaFinalidade.descricao,
          ativo: novaFinalidade.ativo,
          tipo_destaque: novaFinalidade.tipo_destaque
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
      data: novaFinalidade
    }, { status: 201 })
    
  } catch (error) {
    console.error('Erro ao criar finalidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}



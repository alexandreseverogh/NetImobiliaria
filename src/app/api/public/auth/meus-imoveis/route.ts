import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import jwt from 'jsonwebtoken'

// Forçar uso do Node.js runtime
export const runtime = 'nodejs'

// Função para extrair e validar token JWT
function getUserFromToken(request: NextRequest): { userUuid: string, userType: 'cliente' | 'proprietario' } | null {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ MEUS IMOVEIS - Token não fornecido')
      return null
    }

    const token = authHeader.substring(7) // Remove "Bearer "
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'

    let decoded: any
    try {
      decoded = jwt.verify(token, jwtSecret) as any
    } catch (jwtError: any) {
      console.error('❌ MEUS IMOVEIS - Erro ao verificar JWT:', jwtError.message)
      return null
    }

    if (!decoded || !decoded.userUuid || !decoded.userType) {
      console.log('❌ MEUS IMOVEIS - Token inválido (dados faltando)')
      return null
    }

    // Verificar se é proprietário
    if (decoded.userType !== 'proprietario') {
      console.log('❌ MEUS IMOVEIS - Usuário não é proprietário')
      return null
    }

    return {
      userUuid: decoded.userUuid,
      userType: decoded.userType
    }
  } catch (error: any) {
    console.error('❌ MEUS IMOVEIS - Erro ao verificar token:', error)
    return null
  }
}

// =====================================================
// GET - Obter imóveis do proprietário
// =====================================================

export async function GET(request: NextRequest) {
  try {
    // Validar token
    const userAuth = getUserFromToken(request)
    if (!userAuth) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { userUuid } = userAuth

    console.log(`🔍 MEUS IMOVEIS GET - Buscando imóveis do proprietário UUID:`, userUuid)

    // Buscar imóveis do proprietário
    // Usando a tabela imoveis e fazendo JOIN com finalidades_imovel para obter o nome da finalidade
    const query = `
      SELECT 
        i.id,
        i.codigo,
        i.titulo,
        i.estado_fk as estado,
        i.cidade_fk as cidade,
        i.bairro,
        i.endereco,
        i.numero,
        i.complemento,
        i.cep,
        fi.nome as finalidade,
        i.preco,
        i.preco_condominio as condominio,
        i.preco_iptu as iptu,
        i.taxa_extra,
        i.area_construida as area,
        i.area_total,
        i.quartos,
        i.suites,
        i.banheiros,
        i.vagas_garagem as garagens,
        i.varanda,
        i.andar,
        i.total_andares,
        i.created_at
      FROM imoveis i
      LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
      WHERE i.proprietario_uuid = $1::uuid
        AND i.ativo = true
      ORDER BY i.created_at DESC
    `

    const result = await pool.query(query, [userUuid])

    console.log(`✅ MEUS IMOVEIS GET - ${result.rows.length} imóveis encontrados`)
    
    // Processar resultados para garantir tipos corretos
    const processedRows = result.rows.map((row: any) => {
      // Garantir que valores numéricos sejam números, não strings
      return {
        ...row,
        preco: row.preco ? parseFloat(row.preco) : null,
        condominio: row.condominio ? parseFloat(row.condominio) : null,
        iptu: row.iptu ? parseFloat(row.iptu) : null,
        taxa_extra: row.taxa_extra ? parseFloat(row.taxa_extra) : null,
        area: row.area ? parseFloat(row.area) : null,
        area_total: row.area_total ? parseFloat(row.area_total) : null,
        quartos: row.quartos ? parseInt(row.quartos) : null,
        suites: row.suites ? parseInt(row.suites) : null,
        banheiros: row.banheiros ? parseInt(row.banheiros) : null,
        garagens: row.garagens ? parseInt(row.garagens) : null,
        varanda: row.varanda ? parseInt(row.varanda) : null,
        andar: row.andar ? parseInt(row.andar) : null,
        total_andares: row.total_andares ? parseInt(row.total_andares) : null
      }
    })
    
    // Debug: verificar se condominio está sendo retornado
    if (processedRows.length > 0) {
      console.log('🔍 MEUS IMOVEIS GET - Primeiro imóvel (amostra):', {
        id: processedRows[0].id,
        preco: processedRows[0].preco,
        condominio: processedRows[0].condominio,
        iptu: processedRows[0].iptu
      })
    }

    return NextResponse.json({
      success: true,
      data: processedRows
    })

  } catch (error: any) {
    console.error('❌ MEUS IMOVEIS GET - Erro:', error)
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor', error: error?.message },
      { status: 500 }
    )
  }
}


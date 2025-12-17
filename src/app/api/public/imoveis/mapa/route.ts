import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

export const dynamic = 'force-dynamic'

/**
 * API para buscar imóveis com coordenadas para visualização no mapa
 * 
 * Query params:
 * - tipo: 'nacional' | 'local' | 'filtros'
 * - tipo_destaque: 'DV' | 'DA' (para nacional/local)
 * - estado: string (para local/filtros)
 * - cidade: string (para local/filtros)
 * - operation: 'DV' | 'DA' (para filtros)
 * - ...outros filtros (precoMin, precoMax, quartos, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') // 'nacional' | 'local' | 'filtros'
    const tipoDestaque = searchParams.get('tipo_destaque') // 'DV' | 'DA'
    const estado = searchParams.get('estado')
    const cidade = searchParams.get('cidade')
    const operation = searchParams.get('operation') // Para filtros

    console.log('🗺️ [API Mapa] Parâmetros recebidos:', { tipo, estado, cidade, operation })

    let query = `
      SELECT 
        i.id,
        i.titulo,
        i.preco,
        i.latitude,
        i.longitude,
        i.quartos,
        i.suites,
        i.banheiros,
        i.vagas_garagem,
        i.andar,
        i.total_andares,
        i.preco_condominio,
        i.preco_iptu,
        i.taxa_extra,
        ti.nome as tipo_nome,
        fi.nome as finalidade_nome
      FROM imoveis i
      LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
      LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
      INNER JOIN status_imovel si ON i.status_fk = si.id
      WHERE i.ativo = true
        AND si.ativo = true
        AND si.consulta_imovel_internauta = true
        AND i.latitude IS NOT NULL
        AND i.longitude IS NOT NULL
        AND i.latitude != 0
        AND i.longitude != 0
    `

    const params: any[] = []
    let paramIndex = 1

    if (tipo === 'nacional') {
      // Destaques nacionais
      query += ` AND i.destaque_nacional = true`
      
      if (tipoDestaque) {
        query += ` AND fi.tipo_destaque = $${paramIndex}`
        params.push(tipoDestaque)
        paramIndex++
      }
    } else if (tipo === 'local') {
      // Destaques locais
      query += ` AND i.destaque = true`
      
      if (tipoDestaque) {
        query += ` AND fi.tipo_destaque = $${paramIndex}`
        params.push(tipoDestaque)
        paramIndex++
      }
      
      if (estado) {
        query += ` AND UPPER(TRIM(i.estado_fk)) = $${paramIndex}`
        params.push(estado.trim().toUpperCase())
        paramIndex++
      }
      
      if (cidade) {
        // Usar ILIKE para busca flexível (case-insensitive e permite variações)
        query += ` AND UPPER(TRIM(i.cidade_fk)) ILIKE $${paramIndex}`
        params.push(`%${cidade.trim().toUpperCase()}%`)
        paramIndex++
      }
    } else if (tipo === 'filtros') {
      // Resultados de filtros
      if (operation) {
        query += ` AND fi.tipo_destaque = $${paramIndex}`
        params.push(operation)
        paramIndex++
      }
      
      if (estado) {
        query += ` AND UPPER(TRIM(i.estado_fk)) = $${paramIndex}`
        params.push(estado.trim().toUpperCase())
        paramIndex++
      }
      
      if (cidade) {
        // Usar ILIKE para busca flexível (case-insensitive e permite variações)
        query += ` AND UPPER(TRIM(i.cidade_fk)) ILIKE $${paramIndex}`
        params.push(`%${cidade.trim().toUpperCase()}%`)
        paramIndex++
      }
      
      // Outros filtros
      const precoMin = searchParams.get('precoMin')
      const precoMax = searchParams.get('precoMax')
      const quartos = searchParams.get('quartos')
      const banheiros = searchParams.get('banheiros')
      const tipoId = searchParams.get('tipoId')
      const bairro = searchParams.get('bairro')
      
      if (precoMin) {
        query += ` AND i.preco >= $${paramIndex}`
        params.push(parseFloat(precoMin))
        paramIndex++
      }
      
      if (precoMax) {
        query += ` AND i.preco <= $${paramIndex}`
        params.push(parseFloat(precoMax))
        paramIndex++
      }
      
      if (quartos) {
        query += ` AND i.quartos >= $${paramIndex}`
        params.push(parseInt(quartos))
        paramIndex++
      }
      
      if (banheiros) {
        query += ` AND i.banheiros >= $${paramIndex}`
        params.push(parseInt(banheiros))
        paramIndex++
      }
      
      if (tipoId) {
        query += ` AND i.tipo_fk = $${paramIndex}`
        params.push(parseInt(tipoId))
        paramIndex++
      }
      
      if (bairro) {
        query += ` AND i.bairro ILIKE $${paramIndex}`
        params.push(`%${bairro.trim()}%`)
        paramIndex++
      }
    }

    query += ` ORDER BY i.preco DESC`

    const result = await pool.query(query, params)

    const imoveis = result.rows.map((row: any) => ({
      id: row.id,
      titulo: row.titulo,
      preco: parseFloat(row.preco) || 0,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      quartos: row.quartos || 0,
      suites: row.suites || 0,
      banheiros: row.banheiros || 0,
      vagas_garagem: row.vagas_garagem || 0,
      andar: row.andar || null,
      total_andares: row.total_andares || null,
      preco_condominio: row.preco_condominio ? parseFloat(row.preco_condominio) : null,
      preco_iptu: row.preco_iptu ? parseFloat(row.preco_iptu) : null,
      taxa_extra: row.taxa_extra ? parseFloat(row.taxa_extra) : null,
      tipo_nome: row.tipo_nome || 'Não informado',
      finalidade_nome: row.finalidade_nome || 'Não informado'
    }))

    return NextResponse.json({
      success: true,
      data: imoveis,
      total: imoveis.length
    })

  } catch (error: any) {
    console.error('❌ [API Mapa] Erro ao buscar imóveis:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Erro ao buscar imóveis para o mapa'
      },
      { status: 500 }
    )
  }
}


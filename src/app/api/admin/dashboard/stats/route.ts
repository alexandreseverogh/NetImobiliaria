import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

export async function GET(request: NextRequest) {
  try {
    // Buscar estatísticas básicas da tabela imoveis
    const statsQuery = `
      SELECT 
        COUNT(*) as total_imoveis,
        COUNT(CASE WHEN ativo = true THEN 1 END) as imoveis_ativos,
        COUNT(CASE WHEN ativo = false THEN 1 END) as imoveis_inativos
      FROM imoveis
    `
    
    const statsResult = await pool.query(statsQuery)
    const stats = statsResult.rows[0]

    // Buscar distribuição por tipos
    const tiposQuery = `
      SELECT 
        COALESCE(ti.nome, 'Sem tipo') as tipo,
        COUNT(*) as quantidade
      FROM imoveis i
      LEFT JOIN tipos_imovel ti ON i.tipo_id = ti.id
      WHERE i.ativo = true
      GROUP BY ti.nome
      ORDER BY quantidade DESC
    `
    
    const tiposResult = await pool.query(tiposQuery)
    const tiposData = tiposResult.rows

    // Buscar distribuição por finalidades
    const finalidadesQuery = `
      SELECT 
        COALESCE(fi.nome, 'Sem finalidade') as finalidade,
        COUNT(*) as quantidade
      FROM imoveis i
      LEFT JOIN finalidades_imovel fi ON i.finalidade_id = fi.id
      WHERE i.ativo = true
      GROUP BY fi.nome
      ORDER BY quantidade DESC
    `
    
    const finalidadesResult = await pool.query(finalidadesQuery)
    const finalidadesData = finalidadesResult.rows

    // Buscar distribuição por status
    const statusQuery = `
      SELECT 
        COALESCE(si.nome, 'Sem status') as status,
        COALESCE(si.cor, '#3B82F6') as cor,
        COUNT(*) as quantidade
      FROM imoveis i
      LEFT JOIN status_imovel si ON i.status_id = si.id
      WHERE i.ativo = true
      GROUP BY si.nome, si.cor
      ORDER BY quantidade DESC
    `
    
    const statusResult = await pool.query(statusQuery)
    const statusData = statusResult.rows

    // Buscar distribuição por estado
    const estadosQuery = `
      SELECT 
        COALESCE(estado, 'Não informado') as estado,
        COUNT(*) as quantidade
      FROM imoveis
      WHERE ativo = true
      GROUP BY estado
      ORDER BY quantidade DESC
      LIMIT 10
    `
    
    const estadosResult = await pool.query(estadosQuery)

    // Buscar distribuição por município
    const municipiosQuery = `
      SELECT 
        COALESCE(cidade, 'Não informado') as municipio,
        COUNT(*) as quantidade
      FROM imoveis
      WHERE ativo = true
      GROUP BY cidade
      ORDER BY quantidade DESC
      LIMIT 10
    `
    
    const municipiosResult = await pool.query(municipiosQuery)

    // Buscar evolução temporal (últimos 6 meses)
    const evolucaoQuery = `
      SELECT 
        DATE_TRUNC('month', created_at) as mes,
        COUNT(*) as quantidade
      FROM imoveis
      WHERE created_at >= NOW() - INTERVAL '6 months'
      AND ativo = true
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY mes
    `
    
    const evolucaoResult = await pool.query(evolucaoQuery)
    const evolucaoData = evolucaoResult.rows.map(row => ({
      mes: new Date(row.mes).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
      quantidade: parseInt(row.quantidade)
    }))

    return NextResponse.json({
      success: true,
      data: {
        stats: {
          total_imoveis: parseInt(stats.total_imoveis) || 0,
          imoveis_ativos: parseInt(stats.imoveis_ativos) || 0,
          imoveis_inativos: parseInt(stats.imoveis_inativos) || 0
        },
        tipos: tiposData || [],
        finalidades: finalidadesData || [],
        status: statusData || [],
        estados: estadosResult.rows || [],
        municipios: municipiosResult.rows || [],
        evolucao: evolucaoData || []
      }
    })

  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

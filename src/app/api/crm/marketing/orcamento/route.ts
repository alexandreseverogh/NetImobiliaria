import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

/**
 * CRIAR VERBA DE MARKETING
 * Recebe o payload do MarketingCampaignModal
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { 
        utm_campaign, 
        plataforma, 
        publico_alvo, 
        periodo_faixa_horaria, 
        data_inicio, 
        data_fim, 
        valor_investido_brl,
        imovel_id 
    } = data

    if (!utm_campaign || !valor_investido_brl || !data_inicio) {
      return NextResponse.json({ error: 'Campos Obrigatórios: UTM, Valor e Data.' }, { status: 400 })
    }

    // Estruturamos a faixa horária como JSONB dinâmico
    let periodoJson = '[]'
    if (periodo_faixa_horaria) {
        periodoJson = JSON.stringify([periodo_faixa_horaria])
    }

    const query = `
      INSERT INTO marketing_campanhas_orcamento (
        utm_campaign, plataforma, publico_alvo, periodo_faixa_horaria, 
        data_inicio, data_fim, valor_investido_brl, imovel_id
      ) VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8)
      RETURNING id
    `
    const { rows } = await pool.query(query, [
        utm_campaign,
        plataforma || 'N/A',
        publico_alvo || '',
        periodoJson,
        data_inicio,
        data_fim || null,
        valor_investido_brl,
        imovel_id || null
    ])

    return NextResponse.json({ success: true, id: rows[0].id })
  } catch (error: any) {
    console.error('ERRO CRITICO AO SALVAR ORÇAMENTO MKT:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * LISTAR VERBAS MKT (Central de Mídia)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'month';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let timeFilter = '';
    const queryParams: any[] = [];

    if (timeframe === 'month') {
        timeFilter = "WHERE data_inicio >= date_trunc('month', CURRENT_DATE) OR (data_fim IS NULL OR data_fim >= CURRENT_DATE)";
    } else if (timeframe === 'quarter') {
        timeFilter = "WHERE data_inicio >= date_trunc('quarter', CURRENT_DATE) OR (data_fim IS NULL OR data_fim >= CURRENT_DATE)";
    } else if (timeframe === 'custom' && startDate && endDate) {
        timeFilter = "WHERE data_inicio <= $2 AND (data_fim IS NULL OR data_fim >= $1)";
        queryParams.push(startDate, endDate);
    }
    // 'all' = no filter

    const query = `
      SELECT 
        m.*,
        i.titulo as imovel_nome
      FROM marketing_campanhas_orcamento m
      LEFT JOIN imoveis i ON i.id = m.imovel_id
      ${timeFilter}
      ORDER BY data_inicio DESC
    `
    const { rows } = await pool.query(query, queryParams)
    return NextResponse.json({ success: true, campanhas: rows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * ATUALIZAR VERBA MKT (Central de Mídia)
 */
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { 
        id,
        utm_campaign, 
        plataforma, 
        publico_alvo, 
        periodo_faixa_horaria, 
        data_inicio, 
        data_fim, 
        valor_investido_brl,
        imovel_id
    } = data

    if (!id || !utm_campaign || !valor_investido_brl || !data_inicio) {
      return NextResponse.json({ error: 'Campos Obrigatórios: ID, UTM, Valor e Data.' }, { status: 400 })
    }

    let periodoJson = '[]'
    if (periodo_faixa_horaria) {
        periodoJson = JSON.stringify([periodo_faixa_horaria])
    }

    const query = `
      UPDATE marketing_campanhas_orcamento SET
        utm_campaign = $1, 
        plataforma = $2, 
        publico_alvo = $3, 
        periodo_faixa_horaria = $4::jsonb, 
        data_inicio = $5, 
        data_fim = $6, 
        valor_investido_brl = $7,
        imovel_id = $8
      WHERE id = $9
      RETURNING id
    `
    await pool.query(query, [
        utm_campaign,
        plataforma || 'N/A',
        publico_alvo || '',
        periodoJson,
        data_inicio,
        data_fim || null,
        valor_investido_brl,
        imovel_id || null,
        id
    ])

    return NextResponse.json({ success: true, id })
  } catch (error: any) {
    console.error('ERRO CRITICO AO ATUALIZAR ORÇAMENTO MKT:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}



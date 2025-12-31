import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

export const runtime = 'nodejs'

// API pública para exibir informações do plano de corretor (sem autenticação)
export async function GET(request: NextRequest) {
  try {
    // Buscar apenas os parâmetros públicos para exibição no popup
    const result = await pool.query(
      `SELECT 
        valor_corretor, 
        qtde_anuncios_imoveis_corretor, 
        periodo_anuncio_corretor,
        valor_mensal_imovel,
        proximos_corretores_recebem_leads,
        sla_minutos_aceite_lead
      FROM parametros LIMIT 1`
    )

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: { 
          valor_corretor: 0.00,
          qtde_anuncios_imoveis_corretor: 5,
          periodo_anuncio_corretor: 30,
          valor_mensal_imovel: 0.00,
          proximos_corretores_recebem_leads: 3,
          sla_minutos_aceite_lead: 5
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        valor_corretor: parseFloat(result.rows[0].valor_corretor) || 0.00,
        qtde_anuncios_imoveis_corretor: parseInt(result.rows[0].qtde_anuncios_imoveis_corretor) || 5,
        periodo_anuncio_corretor: parseInt(result.rows[0].periodo_anuncio_corretor) || 30,
        valor_mensal_imovel: parseFloat(result.rows[0].valor_mensal_imovel) || 0.00,
        proximos_corretores_recebem_leads: parseInt(result.rows[0].proximos_corretores_recebem_leads) || 3,
        sla_minutos_aceite_lead: parseInt(result.rows[0].sla_minutos_aceite_lead) || 5
      }
    })

  } catch (error) {
    console.error('Erro ao buscar parâmetros públicos do corretor:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}



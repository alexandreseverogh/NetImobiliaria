import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

/**
 * AI INSIGHTS ENGINE (Real-Time)
 * Analisa tendências de intenção (tags) e gargalos operacionais (SLA)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. ANÁLISE DE SENTIMENTO / INTENÇÃO (Últimas 48h vs 48h anteriores)
    const trendQuery = `
      WITH current_period AS (
        SELECT tag_sonho, COUNT(*) as count
        FROM leads_staging
        WHERE created_at >= NOW() - INTERVAL '48 hours'
        AND tag_sonho IS NOT NULL AND tag_sonho != ''
        GROUP BY tag_sonho
      ),
      previous_period AS (
        SELECT tag_sonho, COUNT(*) as count
        FROM leads_staging
        WHERE created_at < NOW() - INTERVAL '48 hours'
        AND created_at >= NOW() - INTERVAL '96 hours'
        AND tag_sonho IS NOT NULL AND tag_sonho != ''
        GROUP BY tag_sonho
      )
      SELECT 
        c.tag_sonho,
        c.count as current_count,
        COALESCE(p.count, 0) as previous_count,
        CASE 
          WHEN COALESCE(p.count, 0) = 0 THEN 100
          ELSE ((c.count - p.count)::float / p.count * 100)::int 
        END as growth_percentage
      FROM current_period c
      LEFT JOIN previous_period p ON c.tag_sonho = p.tag_sonho
      ORDER BY growth_percentage DESC, c.count DESC
      LIMIT 1
    `

    // 2. ANÁLISE DE GARGALOS (Leads estagnados acima do SLA)
    const bottleneckQuery = `
      SELECT COUNT(*)::int as stale_leads
      FROM leads_kanban lk
      JOIN kanban_colunas kc ON kc.id = lk.coluna_id
      WHERE (EXTRACT(EPOCH FROM (NOW() - lk.data_movimentacao)) / 3600) > kc.sla_hours
    `

    const [trendRes, bottleneckRes] = await Promise.all([
      pool.query(trendQuery),
      pool.query(bottleneckQuery)
    ])

    const topTrend = trendRes.rows[0] || { tag_sonho: 'Contatos Gerais', growth_percentage: 0 }
    const stales = bottleneckRes.rows[0]?.stale_leads || 0

    // Lógica para Sugestão de Ação
    let insightText = `A análise de sentimento detectou um aumento de ${topTrend.growth_percentage}% na intenção de "${topTrend.tag_sonho}" nas últimas 48h.`
    let actionText = "Mantenha o monitoramento ativo dos novos leads."
    
    if (topTrend.growth_percentage > 10) {
      actionText = `Recomendamos alinhar o discurso de vendas para focar em "${topTrend.tag_sonho}".`
    }

    if (stales > 5) {
      actionText = `Aviso: ${stales} leads estão estagnados fora do SLA. Notificar corretores imediatamente.`
    } else if (topTrend.tag_sonho.toLowerCase().includes('crédito') || topTrend.tag_sonho.toLowerCase().includes('financiamento')) {
      actionText = "Recomendamos reforçar o fluxo de suporte ao crédito para estes leads."
    }

    return NextResponse.json({
      success: true,
      insight: {
        text: insightText,
        action: actionText,
        trend_tag: topTrend.tag_sonho,
        percentage: topTrend.growth_percentage,
        stale_leads: stales
      }
    })

  } catch (error: any) {
    console.error('ERRO AO GERAR INSIGHTS IA:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

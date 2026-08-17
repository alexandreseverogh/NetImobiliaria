import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'
import { pluralizePtBr } from '@/lib/intelligence/pluralize'

/**
 * AI INSIGHTS ENGINE (Real-Time)
 * Analisa tendências de intenção (tags) e gargalos operacionais (SLA)
 */

function getCurrentUser(request: NextRequest): { userId: string; tenantId?: string; is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('admin_auth_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return null
    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null
    return { userId: decoded.userId, tenantId: decoded.tenantId, is_system_role: decoded.is_system_role === true }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const isMaster = currentUser.is_system_role === true
    const tenantId = isMaster ? (searchParams.get('tenant_id') || currentUser.tenantId) : currentUser.tenantId
    if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })
    const clientId = searchParams.get('client_id')

    const segment = await resolveSegment(tenantId, clientId)
    const roleLabelPlural = pluralizePtBr(segment?.distribution_role_name || 'Atendente')

    // 1. ANÁLISE DE SENTIMENTO / INTENÇÃO (Últimas 48h vs 48h anteriores)
    const trendQuery = `
      WITH current_period AS (
        SELECT tag_sonho, COUNT(*) as count
        FROM leads_staging
        WHERE tenant_id = $1::uuid
        AND created_at >= NOW() - INTERVAL '48 hours'
        AND tag_sonho IS NOT NULL AND tag_sonho != ''
        GROUP BY tag_sonho
      ),
      previous_period AS (
        SELECT tag_sonho, COUNT(*) as count
        FROM leads_staging
        WHERE tenant_id = $1::uuid
        AND created_at < NOW() - INTERVAL '48 hours'
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
    // leads_kanban.tenant_id nem sempre está preenchido (mesmo achado de leads_kanban_ciclos
    // em G0) — escopo por tenant via JOIN em leads_staging, fonte confiável.
    const bottleneckQuery = `
      SELECT COUNT(*)::int as stale_leads
      FROM leads_kanban lk
      JOIN leads_staging ls ON ls.lead_uuid = lk.lead_uuid
      JOIN kanban_colunas kc ON kc.id = lk.coluna_id
      WHERE ls.tenant_id = $1::uuid
        AND (EXTRACT(EPOCH FROM (NOW() - lk.data_movimentacao)) / 3600) > kc.sla_hours
    `

    const [trendRes, bottleneckRes] = await Promise.all([
      pool.query(trendQuery, [tenantId]),
      pool.query(bottleneckQuery, [tenantId])
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
      actionText = `Aviso: ${stales} leads estão estagnados fora do SLA. Notificar ${roleLabelPlural} imediatamente.`
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

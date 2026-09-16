import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'
import { pluralizePtBr } from '@/lib/intelligence/pluralize'
import { resolveTimeframeRange } from '@/lib/crm/resolveTimeframeRange'

/**
 * Performance por Vendedor — painel honesto, construído direto de leads_staging/leads_kanban,
 * SEM passar por corretor_scores/gamificação (descartado: hardcoded pra role.name='Corretor',
 * "vendas_realizadas" nunca é escrito em lugar nenhum do código, só cobre o fluxo legado
 * imovel_prospects). Fonte agnóstica por construção: leads_staging.corretor_atribuido_id já é
 * o campo genérico que TODAS as estratégias de distribuição usam, independente do nome do
 * cargo no segmento — só a legenda do painel (via distribution_role_name) muda por segmento.
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

    const timeframe = searchParams.get('timeframe') || '30'
    const { from, to } = resolveTimeframeRange(timeframe, searchParams.get('startDate'), searchParams.get('endDate'))

    const segment = await resolveSegment(tenantId)
    const roleLabelPlural = pluralizePtBr(segment?.distribution_role_name || 'Atendente')

    // Performance por vendedor — só quem tem ≥1 lead atribuído no período, nunca filtrado por
    // nome de role.
    const performanceQuery = `
      WITH primeira_resposta AS (
        SELECT usuario_id, lead_uuid, MIN(created_at) AS respondido_em
        FROM atividades_lead
        WHERE usuario_id IS NOT NULL AND deleted_at IS NULL AND origem = 'humano'
        GROUP BY usuario_id, lead_uuid
      )
      SELECT
        u.id,
        u.nome,
        COUNT(DISTINCT ls.lead_uuid)::int AS leads_atribuidos,
        COUNT(DISTINCT CASE WHEN kc.is_ganho = true THEN ls.lead_uuid END)::int AS negocios_fechados,
        SUM(CASE WHEN kc.is_ganho = true THEN COALESCE(ls.valor_venda, 0) ELSE 0 END)::float AS valor_fechado,
        COUNT(DISTINCT CASE WHEN kc.is_perda = true THEN ls.lead_uuid END)::int AS negocios_perdidos,
        SUM(CASE WHEN kc.is_perda = true THEN COALESCE(ls.valor_venda_estimado, 0) ELSE 0 END)::float AS valor_perdido_estimado,
        SUM(CASE WHEN kc.is_ganho IS NOT TRUE AND kc.is_perda IS NOT TRUE THEN COALESCE(ls.valor_venda_estimado, 0) ELSE 0 END)::float AS pipeline_estimado,
        AVG(EXTRACT(EPOCH FROM (pr.respondido_em - ls.atribuido_em)) / 60.0)
          FILTER (WHERE pr.respondido_em IS NOT NULL AND ls.atribuido_em IS NOT NULL AND pr.respondido_em >= ls.atribuido_em)::float AS tempo_medio_resposta_min
      FROM leads_staging ls
      JOIN users u ON u.id = ls.corretor_atribuido_id
      LEFT JOIN leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
      LEFT JOIN kanban_colunas kc ON kc.id = lk.coluna_id
      LEFT JOIN primeira_resposta pr ON pr.usuario_id = u.id AND pr.lead_uuid = ls.lead_uuid
      WHERE ls.tenant_id = $1::uuid
        AND ls.corretor_atribuido_id IS NOT NULL
        AND ls.created_at >= $2::timestamptz AND ls.created_at < $3::timestamptz
      GROUP BY u.id, u.nome
      ORDER BY valor_fechado DESC
    `

    // Motivos de perda — dado 100% real (texto digitado por quem perdeu o negócio), zero
    // número inventado.
    const motivosQuery = `
      SELECT lk.motivo_perda AS motivo, COUNT(*)::int AS total
      FROM leads_kanban lk
      JOIN leads_staging ls ON ls.lead_uuid = lk.lead_uuid
      JOIN kanban_colunas kc ON kc.id = lk.coluna_id AND kc.is_perda = true
      WHERE ls.tenant_id = $1::uuid
        AND lk.motivo_perda IS NOT NULL AND TRIM(lk.motivo_perda) <> ''
        AND ls.created_at >= $2::timestamptz AND ls.created_at < $3::timestamptz
      GROUP BY lk.motivo_perda
      ORDER BY total DESC
      LIMIT 10
    `

    const [perfRes, motivosRes] = await Promise.all([
      pool.query(performanceQuery, [tenantId, from, to]),
      pool.query(motivosQuery, [tenantId, from, to]),
    ])

    return NextResponse.json({
      success: true,
      role_label_plural: roleLabelPlural,
      vendedores: perfRes.rows.map((r: any) => ({
        id: r.id,
        nome: r.nome,
        leadsAtribuidos: Number(r.leads_atribuidos),
        negociosFechados: Number(r.negocios_fechados),
        valorFechado: Number(r.valor_fechado),
        negociosPerdidos: Number(r.negocios_perdidos),
        valorPerdidoEstimado: Number(r.valor_perdido_estimado),
        pipelineEstimado: Number(r.pipeline_estimado),
        tempoMedioRespostaMin: r.tempo_medio_resposta_min != null ? Number(r.tempo_medio_resposta_min) : null,
      })),
      motivos_perda: motivosRes.rows.map((r: any) => ({ motivo: r.motivo, total: Number(r.total) })),
    })

  } catch (error: any) {
    console.error('ERRO AO PROCESSAR PERFORMANCE POR VENDEDOR:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

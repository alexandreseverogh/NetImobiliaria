import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { resolveTimeframeRange } from '@/lib/crm/resolveTimeframeRange'

/**
 * CRM PERFORMANCE DASHBOARD (Nível 1) — substitui o antigo "roi/route.ts".
 *
 * Decisão fechada com o usuário (docs/CHECKPOINT.md, 2026-08-13): o CRM não mede mais
 * custo/ROI/CAC/CPL de marketing — nenhuma fonte disponível (verba manual OU gasto sincronizado
 * de mídia paga) representa o custo comercial TOTAL de um negócio, e rotular uma fração como
 * "ROI" empresta uma credibilidade que o número não tem. Esta rota mede só o que o CRM sabe de
 * verdade: leads captados, negócios fechados/perdidos, pipeline em aberto (por valor
 * ESTIMADO — nunca confundido com o valor REAL de fechamento), taxa de conversão e ciclo médio
 * de venda.
 */

/**
 * "Valor Estimado Total" — pedido do usuário (2026-08-16): somar o campo de preço que já
 * aparece nos cards do Kanban ("Faixa de Preço" no segmento Venda de Carros, mas o rótulo é
 * curado por segmento/tenant no Segment Builder — nunca hardcoded). O marcador ESTÁVEL entre
 * segmentos não é o texto do label, é `icone === 'dollar-sign'` — gravado pelo
 * EnrichmentService sempre que o campo é do tipo `currency` na config do Segment Builder
 * (src/lib/crm/enrichmentService.ts, tanto no Vínculo Exato quanto no Perfil de Interesse
 * genérico). `valor` já vem formatado como moeda pt-BR (ex.: "R$ 60.000,00") — precisa
 * parsear de volta pra número.
 */
function parseCurrencyBadgeValue(valor: unknown): number {
  if (typeof valor !== 'string') return 0
  const cleaned = valor.replace(/[^\d.,]/g, '')
  if (!cleaned) return 0
  const normalized = cleaned.replace(/\./g, '').replace(',', '.')
  const num = Number(normalized)
  return isNaN(num) ? 0 : num
}

function sumFaixaDePrecoBadge(enriquecimentoCache: any): number {
  const badges = enriquecimentoCache?.badges
  if (!Array.isArray(badges)) return 0
  const priceBadge = badges.find((b: any) => b?.icone === 'dollar-sign')
  return priceBadge ? parseCurrencyBadgeValue(priceBadge.valor) : 0
}

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

    // Leads captados (fluxo) — quantos leads nasceram no período. `enriquecimento_cache` vem
    // junto pra somar o badge de "Faixa de Preço" em JS (sumFaixaDePrecoBadge acima) — não dá
    // pra somar isso em SQL puro, é texto formatado dentro de um JSONB de forma livre.
    const leadsCaptadosQuery = `
      SELECT enriquecimento_cache
      FROM leads_staging
      WHERE tenant_id = $1::uuid AND created_at >= $2::timestamptz AND created_at < $3::timestamptz
    `

    // Negócios fechados/perdidos — escopados por QUANDO o negócio chegou na etapa terminal
    // (leads_kanban.data_movimentacao, sempre reflete o move mais recente — se a etapa atual é
    // terminal, é exatamente a data em que virou Ganho/Perda), não por quando o lead nasceu.
    // Ciclo médio de venda: só sobre quem fechou no período, tempo desde a criação do lead.
    const negociosQuery = `
      SELECT
        COUNT(CASE WHEN kc.is_ganho = true THEN 1 END)::int AS negocios_fechados,
        SUM(CASE WHEN kc.is_ganho = true THEN COALESCE(ls.valor_venda, 0) ELSE 0 END)::float AS valor_fechado,
        COUNT(CASE WHEN kc.is_perda = true THEN 1 END)::int AS negocios_perdidos,
        SUM(CASE WHEN kc.is_perda = true THEN COALESCE(ls.valor_venda_estimado, 0) ELSE 0 END)::float AS valor_perdido_estimado,
        AVG(CASE WHEN kc.is_ganho = true
              THEN EXTRACT(EPOCH FROM (lk.data_movimentacao - ls.created_at)) / 86400.0
            END)::float AS ciclo_medio_dias
      FROM leads_kanban lk
      JOIN leads_staging ls ON ls.lead_uuid = lk.lead_uuid
      JOIN kanban_colunas kc ON kc.id = lk.coluna_id
      WHERE ls.tenant_id = $1::uuid
        AND (kc.is_ganho = true OR kc.is_perda = true)
        AND lk.data_movimentacao >= $2::timestamptz AND lk.data_movimentacao < $3::timestamptz
    `

    // Pipeline aberto — snapshot de agora (nunca filtrado por período: pipeline é "o que está
    // em jogo hoje", não um fluxo do período). Valor sempre ESTIMADO, nunca o valor_venda real
    // (que só existe pra negócio já fechado).
    const pipelineQuery = `
      SELECT
        COUNT(*)::int AS pipeline_leads,
        SUM(COALESCE(ls.valor_venda_estimado, 0))::float AS pipeline_estimado
      FROM leads_staging ls
      LEFT JOIN leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
      LEFT JOIN kanban_colunas kc ON kc.id = lk.coluna_id
      WHERE ls.tenant_id = $1::uuid
        AND kc.is_ganho IS NOT TRUE AND kc.is_perda IS NOT TRUE
    `

    // Gargalos & Ciclos (mantido, já 100% CRM-nativo) — leads_kanban_ciclos.tenant_id nunca é
    // preenchido pelo trigger (achado real, G0), por isso o escopo vem via JOIN em
    // leads_staging (fonte confiável).
    const cycleQuery = `
       SELECT
          kc.nome as coluna_atual,
          kc.sla_hours,
          COUNT(lkc.lead_uuid) as amostras,
          AVG(EXTRACT(EPOCH FROM (COALESCE(lkc.data_saida, CURRENT_TIMESTAMP) - lkc.data_entrada))/3600) as tempo_medio_horas
       FROM leads_kanban_ciclos lkc
       JOIN leads_staging ls ON ls.lead_uuid = lkc.lead_uuid
       LEFT JOIN kanban_colunas kc ON kc.id = lkc.coluna_id
       WHERE ls.tenant_id = $1::uuid AND lkc.data_entrada >= $2::timestamptz AND lkc.data_entrada < $3::timestamptz
       GROUP BY kc.nome, kc.sla_hours, lkc.coluna_id
       ORDER BY tempo_medio_horas DESC
    `

    const [leadsRes, negociosRes, pipelineRes, cycleRes] = await Promise.all([
      pool.query(leadsCaptadosQuery, [tenantId, from, to]),
      pool.query(negociosQuery, [tenantId, from, to]),
      pool.query(pipelineQuery, [tenantId]),
      pool.query(cycleQuery, [tenantId, from, to]),
    ])

    const leadsCaptados = leadsRes.rows.length
    const valorEstimadoTotal = leadsRes.rows.reduce(
      (sum, row) => sum + sumFaixaDePrecoBadge(row.enriquecimento_cache), 0
    )
    const negocios = negociosRes.rows[0] || {}
    const negociosFechados = Number(negocios.negocios_fechados || 0)
    const valorFechado = Number(negocios.valor_fechado || 0)
    const negociosPerdidos = Number(negocios.negocios_perdidos || 0)
    const valorPerdidoEstimado = Number(negocios.valor_perdido_estimado || 0)
    const cicloMedioDias = negocios.ciclo_medio_dias != null ? Number(negocios.ciclo_medio_dias) : null

    const pipeline = pipelineRes.rows[0] || {}
    const pipelineLeads = Number(pipeline.pipeline_leads || 0)
    const pipelineEstimado = Number(pipeline.pipeline_estimado || 0)

    const totalTerminal = negociosFechados + negociosPerdidos
    const taxaConversao = totalTerminal > 0 ? negociosFechados / totalTerminal : null
    const taxaPerda = totalTerminal > 0 ? negociosPerdidos / totalTerminal : null

    return NextResponse.json({
      success: true,
      kpis: {
        leads_captados: leadsCaptados,
        valor_estimado_total: valorEstimadoTotal,
        negocios_fechados: negociosFechados,
        valor_fechado: valorFechado,
        negocios_perdidos: negociosPerdidos,
        valor_perdido_estimado: valorPerdidoEstimado,
        pipeline_leads: pipelineLeads,
        pipeline_estimado: pipelineEstimado,
        taxa_conversao: taxaConversao,
        taxa_perda: taxaPerda,
        ciclo_medio_dias: cicloMedioDias,
      },
      cycle_heatmap: cycleRes.rows,
    })

  } catch (error: any) {
    console.error('ERRO AO PROCESSAR CRM PERFORMANCE:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

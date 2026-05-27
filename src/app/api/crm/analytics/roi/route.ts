import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

/**
 * MASTER ANALYTICS ROUTE (Nível 1 & 2)
 * Cruza Inteligência de Marketing (Dinheiro) com CRM Operacional (Kanban/Tempos)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '30' // default 30 days
    const campaignId = searchParams.get('campaign_id') // Para Nível 2 (Drill-Down isolado)

    const dateFilterMarketing = `AND mco.data_inicio >= CURRENT_DATE - INTERVAL '${timeframe} days'`;
    const dateFilterLeads = `AND ls.created_at >= CURRENT_DATE - INTERVAL '${timeframe} days'`;

    // No futuro, vgv de fato usa um campo de "valor_fechado", aqui usamos o price original de staging como Pipeline VGV.
    // Mas para simplificar o calculo, vamos puxar métricas agregadas por UTM

    // 1. REGRA GUARDIÃ: Buscar metadados do segmento para agnosticismo
    const domainId = searchParams.get('domainId') || '1'
    const configRes = await pool.query(`
      SELECT target_table, target_fk_column 
      FROM crm_segmentos_config 
      WHERE domain_id = $1 AND is_active = true 
      LIMIT 1
    `, [domainId])

    const { target_table, target_fk_column } = configRes.rows[0] || { target_table: 'imoveis', target_fk_column: 'imovel_id' }
    const targetNameColumn = target_table === 'imoveis' ? 'titulo' : 'nome'

    let kpiQuery = `
       WITH CurrentMkt AS (
          SELECT COALESCE(SUM(valor_investido_brl), 0) as total_investido
          FROM marketing_campanhas_orcamento mco
          WHERE 1=1 ${dateFilterMarketing}
       ),
       CurrentLeads AS (
          SELECT 
            COUNT(ls.lead_uuid)::int as total_leads,
            COUNT(CASE WHEN kc.nome = 'fechamento' THEN 1 END)::int as total_vendas,
            SUM(CASE WHEN kc.nome = 'fechamento' THEN COALESCE(ls.valor_venda, 0) ELSE 0 END)::float as total_vgv,
            COUNT(CASE WHEN ls.utm_campaign IS NOT NULL THEN 1 END)::int as leads_mkt
          FROM leads_staging ls
          LEFT JOIN leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
          LEFT JOIN kanban_colunas kc ON kc.id = lk.coluna_id
          WHERE 1=1 ${dateFilterLeads}
       )
       SELECT 
          c.total_investido::float,
          l.total_leads,
          l.total_vendas,
          l.total_vgv,
          l.leads_mkt
       FROM CurrentMkt c CROSS JOIN CurrentLeads l
    `

    // Drill down na performance por campanha (Foco 100% Atração de Leads)
    let campaignROIQuery = `
       SELECT 
          mco.id as mkt_id, 
          mco.utm_campaign,
          mco.plataforma,
          COALESCE(mco.valor_investido_brl, 0)::float as budget,
          COUNT(ls.lead_uuid)::int as total_leads,
          CASE 
             WHEN COUNT(ls.lead_uuid) > 0 THEN (COALESCE(mco.valor_investido_brl, 0) / COUNT(ls.lead_uuid))::float 
             ELSE 0.0 
          END as cpl,
          AVG(COALESCE(ls.score_prontidao, 0))::float as avg_score,
          COALESCE(json_agg(json_build_object(
             'lead_uuid', ls.lead_uuid,
             'nome', ls.nome,
             'created_at', ls.created_at,
             'status', kc.titulo_exibicao,
             'sla_hours', kc.sla_hours,
             'last_move', lk.data_movimentacao
          )) FILTER (WHERE ls.lead_uuid IS NOT NULL), '[]') as leads_detalhe
       FROM marketing_campanhas_orcamento mco
       LEFT JOIN leads_staging ls ON (TRIM(ls.utm_campaign) = TRIM(mco.utm_campaign) OR ls.utm_campaign = mco.id::text)
       LEFT JOIN leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
       LEFT JOIN kanban_colunas kc ON kc.id = lk.coluna_id
       WHERE 1=1 ${dateFilterMarketing}
       GROUP BY mco.id, mco.utm_campaign, mco.plataforma, mco.valor_investido_brl
       ORDER BY mco.valor_investido_brl DESC
    `

    // ROI CORE: Agrupamento por Produto/Serviço (Agnóstico) - Visão CFO
    let projectROIQuery = `
       WITH ProjectBudgets AS (
          SELECT 
             COALESCE(objeto_id, imovel_id) as target_id, 
             SUM(valor_investido_brl) as budget_sum 
          FROM marketing_campanhas_orcamento 
          GROUP BY COALESCE(objeto_id, imovel_id)
       ),
       ProjectResults AS (
          SELECT 
             obj.id as project_id, 
             obj.${targetNameColumn} as project_name,
             COUNT(DISTINCT ls.lead_uuid)::int as total_leads,
             COUNT(DISTINCT CASE WHEN kc.nome = 'fechamento' THEN ls.lead_uuid END)::int as vitorias,
             SUM(CASE WHEN kc.nome = 'fechamento' THEN COALESCE(ls.valor_venda, 0) ELSE 0 END)::float as vgv_total,
             COALESCE(json_agg(json_build_object(
                'lead_uuid', ls.lead_uuid,
                'nome', ls.nome,
                'created_at', ls.created_at,
                'status', kc.titulo_exibicao,
                'sla_hours', kc.sla_hours,
                'last_move', lk.data_movimentacao
             )) FILTER (WHERE ls.lead_uuid IS NOT NULL), '[]') as leads_detalhe
          FROM ${target_table} obj
          LEFT JOIN leads_staging ls ON ls.${target_fk_column}::text = obj.id::text
          LEFT JOIN leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
          LEFT JOIN kanban_colunas kc ON kc.id = lk.coluna_id
          GROUP BY obj.id, obj.${targetNameColumn}
       )
       SELECT 
          pr.*, 
          COALESCE(pb.budget_sum, 0)::float as budget_total 
       FROM ProjectResults pr
       JOIN ProjectBudgets pb ON pb.target_id::text = pr.project_id::text
       WHERE COALESCE(pb.budget_sum, 0) > 0
    `

    // Mapa de Gargalos - Tempo Médio por Fase do Kanban (HeatMap dos Ciclos)
    let cycleQuery = `
       SELECT 
          kc.nome as coluna_atual,
          kc.sla_hours,
          COUNT(lkc.lead_uuid) as amostras,
          AVG(EXTRACT(EPOCH FROM (COALESCE(lkc.data_saida, CURRENT_TIMESTAMP) - lkc.data_entrada))/3600) as tempo_medio_horas
       FROM leads_kanban_ciclos lkc
       LEFT JOIN kanban_colunas kc ON kc.id = lkc.coluna_id
       WHERE lkc.data_entrada >= CURRENT_DATE - INTERVAL '${timeframe} days'
       GROUP BY kc.nome, kc.sla_hours, lkc.coluna_id
       ORDER BY tempo_medio_horas DESC
    `

    const [kpiRows, campaignRows, cycleRows, projectRows] = await Promise.all([
        pool.query(kpiQuery),
        pool.query(campaignROIQuery),
        pool.query(cycleQuery),
        pool.query(projectROIQuery)
    ])

    const globalKPIs = kpiRows.rows[0] || { total_investido: 0, total_leads: 0, total_vendas: 0, total_vgv: 0, leads_mkt: 0 }
    
    // Calcula derivados base
    const total_investido = Number(globalKPIs.total_investido)
    const total_vendas = Number(globalKPIs.total_vendas)
    const total_vgv = Number(globalKPIs.total_vgv)
    const leads_mkt = Number(globalKPIs.leads_mkt)

    const cac_global = total_vendas > 0 ? total_investido / total_vendas : 0
    const cpl_global = leads_mkt > 0 ? total_investido / leads_mkt : 0
    const roi_global = total_investido > 0 ? total_vgv / total_investido : 0

    const campaignFormatted = campaignRows.rows.map((row: any) => ({
       ...row,
       budget: Number(row.budget),
       cpl: Number(row.cpl),
       cac: Number(row.cac),
       roi: Number(row.budget) > 0 ? Number(row.vgv_gerado || 0) / Number(row.budget) : 0,
       total_leads: Number(row.total_leads),
       vitorias: Number(row.vitorias)
    }));

    return NextResponse.json({ 
        success: true, 
        kpis: {
            total_investido,
            total_leads: Number(globalKPIs.total_leads),
            total_vendas,
            total_vgv,
            leads_mkt,
            cac_global,
            cpl_global,
            roi_global
        },
        campaign_roi: campaignFormatted,
        project_roi: projectRows.rows.map((p: any) => ({
           ...p,
           roi: Number(p.budget_total) > 0 ? Number(p.vgv_total) / Number(p.budget_total) : 0
        })),
        cycle_heatmap: cycleRows.rows
    })

  } catch (error: any) {
    console.error('ERRO AO PROCESSAR ANALYTICS BI:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

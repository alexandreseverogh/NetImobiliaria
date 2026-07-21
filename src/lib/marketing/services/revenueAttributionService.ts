/**
 * Visão 4 — Funil de Receita / Unificado (docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §5/§6, F6).
 *
 * Atribui receita real de volta à campanha: CPA real (custo por negócio fechado) e ROAS real
 * (receita/investimento), em vez do "custo por clique" hoje chamado de CPA no resto do módulo.
 * Só faz sentido quando o tenant tem Campanhas E CRM contratados (C+R) — sem CRM não existe
 * `leads_staging`/`leads_kanban` pra saber que um lead virou negócio fechado.
 *
 * Metodologia de janela (cohort): tanto os leads identificados quanto os negócios fechados são
 * filtrados por `marketing_eventos.created_at` dentro do período — ou seja, "dos leads gerados
 * neste período, quantos já viraram negócio fechado" (independente de quando o negócio fechou
 * de fato), consistente com o gasto do mesmo período. Isso evita misturar receita de um cohort
 * de leads antigo com o gasto de um período recente.
 *
 * Simplificação conhecida: quando o mesmo lead tem mais de um marketing_eventos (multi-touch,
 * ex.: clicou em 2 anúncios diferentes antes de virar lead), a receita é contada inteira em
 * CADA campanha que o tocou — não é atribuição fracionada. Suficiente para o MVP desta fase;
 * atribuição multi-touch fracionada fica para uma iteração futura, fora do escopo do F6.
 */
import pool from '@/lib/database/connection'

export interface CampaignRevenueRow {
  campaignId: string
  campaignName: string
  clientId: string | null
  spend: number
  leadsIdentified: number
  dealsWon: number
  revenue: number
  cpaReal: number | null
  roasReal: number | null
}

export interface RevenueAttributionTotals {
  spend: number
  leadsIdentified: number
  dealsWon: number
  revenue: number
  cpaReal: number | null
  roasReal: number | null
}

export interface RevenueAttributionResult {
  campaigns: CampaignRevenueRow[]
  totals: RevenueAttributionTotals
  periodDays: number
}

/** Verifica se o tenant tem o módulo de CRM contratado — condição pra Visão 4 existir (§1.1). */
export async function hasCrmModule(tenantId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1
       FROM public.tenant_modules tm
       JOIN public.system_modules sm ON sm.id = tm.module_id
      WHERE tm.tenant_id = $1::uuid AND sm.slug = 'crm' AND tm.is_enabled = true
      LIMIT 1`,
    [tenantId],
  )
  return rows.length > 0
}

export async function getRevenueAttribution(params: {
  tenantId: string
  /** undefined = todas as campanhas (próprias + clientes); null | 'own' = só próprias; uuid = só daquele cliente */
  clientId?: string | null
  periodDays: number
}): Promise<RevenueAttributionResult> {
  const { tenantId, clientId, periodDays } = params
  const period = Math.min(Math.max(Math.floor(periodDays) || 30, 1), 365)

  const clientClauseParts: string[] = []
  const values: any[] = [tenantId, period]
  if (clientId === 'own' || clientId === null) {
    clientClauseParts.push('AND camp.client_id IS NULL')
  } else if (clientId) {
    values.push(clientId)
    clientClauseParts.push(`AND camp.client_id = $${values.length}::uuid`)
  }
  const clientClause = clientClauseParts.join(' ')

  const { rows } = await pool.query<{
    campaign_id: string
    campaign_name: string
    client_id: string | null
    spend: string
    leads_identified: string
    deals_won: string
    revenue: string
  }>(
    `
    WITH spend AS (
      SELECT camp.id AS campaign_id, camp.name AS campaign_name, camp.client_id,
             COALESCE(SUM(i.spend), 0) AS spend
      FROM campanhasmarketingdigital."Campaign" camp
      LEFT JOIN campanhasmarketingdigital."Insight" i
        ON i."campaignId" = camp.id
        AND i.date >= NOW() - ($2 || ' days')::INTERVAL
      WHERE camp.tenant_id = $1::uuid ${clientClause}
      GROUP BY camp.id, camp.name, camp.client_id
    ),
    cohort AS (
      SELECT me.campaign_id, me.lead_uuid
      FROM public.marketing_eventos me
      WHERE me.tenant_id = $1::uuid
        AND me.campaign_id IS NOT NULL
        AND me.created_at >= NOW() - ($2 || ' days')::INTERVAL
    ),
    leads AS (
      SELECT campaign_id, COUNT(DISTINCT lead_uuid) AS leads_identified
      FROM cohort
      GROUP BY campaign_id
    ),
    deals AS (
      SELECT cohort.campaign_id,
             COUNT(DISTINCT ls.lead_uuid) AS deals_won,
             COALESCE(SUM(ls.valor_venda), 0) AS revenue
      FROM cohort
      JOIN public.leads_staging ls ON ls.lead_uuid = cohort.lead_uuid
      JOIN public.leads_kanban lk ON lk.lead_uuid = ls.lead_uuid
      JOIN public.kanban_colunas kc ON kc.id = lk.coluna_id AND kc.nome = 'fechamento'
      GROUP BY cohort.campaign_id
    )
    SELECT
      spend.campaign_id, spend.campaign_name, spend.client_id, spend.spend::text AS spend,
      COALESCE(leads.leads_identified, 0)::text AS leads_identified,
      COALESCE(deals.deals_won, 0)::text AS deals_won,
      COALESCE(deals.revenue, 0)::text AS revenue
    FROM spend
    LEFT JOIN leads ON leads.campaign_id = spend.campaign_id
    LEFT JOIN deals ON deals.campaign_id = spend.campaign_id
    WHERE spend.spend > 0 OR COALESCE(leads.leads_identified, 0) > 0
    ORDER BY spend.spend DESC
    `,
    values,
  )

  const campaigns: CampaignRevenueRow[] = rows.map(r => {
    const spend = parseFloat(r.spend)
    const dealsWon = parseInt(r.deals_won, 10)
    const revenue = parseFloat(r.revenue)
    return {
      campaignId: r.campaign_id,
      campaignName: r.campaign_name,
      clientId: r.client_id,
      spend,
      leadsIdentified: parseInt(r.leads_identified, 10),
      dealsWon,
      revenue,
      cpaReal: dealsWon > 0 ? spend / dealsWon : null,
      roasReal: spend > 0 ? revenue / spend : null,
    }
  })

  const totals = campaigns.reduce<RevenueAttributionTotals>(
    (acc, c) => {
      acc.spend += c.spend
      acc.leadsIdentified += c.leadsIdentified
      acc.dealsWon += c.dealsWon
      acc.revenue += c.revenue
      return acc
    },
    { spend: 0, leadsIdentified: 0, dealsWon: 0, revenue: 0, cpaReal: null, roasReal: null },
  )
  totals.cpaReal = totals.dealsWon > 0 ? totals.spend / totals.dealsWon : null
  totals.roasReal = totals.spend > 0 ? totals.revenue / totals.spend : null

  return { campaigns, totals, periodDays: period }
}

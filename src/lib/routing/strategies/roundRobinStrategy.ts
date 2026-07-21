import type { DistributionStrategy, DistributionStrategyContext, DistributionStrategyResult } from './types'

/**
 * Distribuição por fila pura (round-robin) — sem geografia, sem dono de ativo. Pra segmentos
 * onde localização não é um critério de negócio (ex.: consultoria B2B nacional, SaaS) — só
 * importa dar o próximo lead pra quem recebeu menos recentemente. config opcional:
 *   { slaMinutos } (default 15)
 */
export const roundRobinStrategy: DistributionStrategy = {
  key: 'round_robin',

  async findCandidate(ctx: DistributionStrategyContext): Promise<DistributionStrategyResult | null> {
    const { slaMinutos = 15 } = ctx.config || {}

    const q = `
      SELECT
        u.id, u.nome, u.email, u.tipo_corretor, u.is_plantonista,
        COALESCE(cs.nivel, 0) as nivel,
        COUNT(a.corretor_fk) AS total_recebidos,
        MAX(a.created_at) AS ultimo_recebimento
      FROM public.users u
      INNER JOIN public.user_tenant_membership utm ON u.id = utm.user_id
      INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
      INNER JOIN public.user_roles ur ON ura.role_id = ur.id
      LEFT JOIN public.corretor_scores cs ON cs.user_id = u.id
      LEFT JOIN (
        SELECT corretor_fk, created_at FROM public.imovel_prospect_atribuicoes
        UNION ALL
        SELECT corretor_atribuido_id as corretor_fk, created_at FROM public.leads_staging WHERE corretor_atribuido_id IS NOT NULL
      ) a ON a.corretor_fk = u.id
      WHERE u.ativo = true
        AND utm.tenant_id = $2
        AND ur.name = $3
        AND COALESCE(u.is_plantonista, false) = false
        AND (CASE WHEN array_length($1::uuid[], 1) > 0 THEN u.id != ALL($1::uuid[]) ELSE true END)
      GROUP BY u.id, u.nome, u.email, u.tipo_corretor, u.is_plantonista, cs.nivel, u.created_at
      ORDER BY
        COUNT(a.corretor_fk) ASC,
        MAX(a.created_at) ASC NULLS FIRST,
        COALESCE(cs.nivel, 0) DESC,
        u.created_at ASC
      LIMIT 1
    `
    const r = await ctx.dbClient.query(q, [ctx.excludeIds, ctx.tenantId, ctx.sellerRoleName])
    const row = r.rows[0]
    if (!row) return null

    const expiraEm = new Date()
    expiraEm.setMinutes(expiraEm.getMinutes() + slaMinutos)

    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      tipo_corretor: row.tipo_corretor,
      is_plantonista: row.is_plantonista,
      sla_minutos: slaMinutos,
      motivo_atribuicao: 'round_robin',
      expira_em: expiraEm,
    }
  },
}

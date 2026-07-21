import type { DistributionStrategy, DistributionStrategyContext, DistributionStrategyResult } from './types'

/**
 * Nível 4 — fallback final: corretor de plantão (is_plantonista=true), priorizando quem
 * atua na mesma área do lead quando existir, senão o de menor carga globalmente. Sempre
 * roda por último e sempre com atribuição definitiva (sem expiração) — é o "ninguém mais
 * disponível, alguém tem que ficar responsável" da cascata.
 */
export const plantonistaFallbackStrategy: DistributionStrategy = {
  key: 'plantonista_fallback',

  async findCandidate(ctx: DistributionStrategyContext): Promise<DistributionStrategyResult | null> {
    const q = `
      SELECT u.id, u.nome, u.email, u.tipo_corretor, u.is_plantonista
      FROM public.users u
      INNER JOIN public.user_tenant_membership utm ON u.id = utm.user_id
      INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
      INNER JOIN public.user_roles ur ON ura.role_id = ur.id
      LEFT JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      LEFT JOIN (
         SELECT corretor_fk, created_at FROM public.imovel_prospect_atribuicoes
         UNION ALL
         SELECT corretor_atribuido_id as corretor_fk, created_at FROM public.leads_staging WHERE corretor_atribuido_id IS NOT NULL
      ) a ON a.corretor_fk = u.id
      WHERE u.ativo = true
        AND utm.tenant_id = $4
        AND ur.name = $5
        AND COALESCE(u.is_plantonista, false) = true
        AND (CASE WHEN array_length($1::uuid[], 1) > 0 THEN u.id != ALL($1::uuid[]) ELSE true END)
      GROUP BY u.id, u.nome, u.email, u.tipo_corretor, u.is_plantonista, u.created_at, caa.estado_fk, caa.cidade_fk
      ORDER BY
        (CASE WHEN caa.estado_fk = $2 AND caa.cidade_fk = $3 THEN 0 ELSE 1 END) ASC,
        COUNT(a.corretor_fk) ASC,
        MAX(a.created_at) ASC NULLS FIRST,
        u.created_at ASC
      LIMIT 1
    `
    const r = await ctx.dbClient.query(q, [ctx.excludeIds, ctx.estadoFk || '', ctx.cidadeFk || '', ctx.tenantId, ctx.sellerRoleName])
    const row = r.rows[0]
    if (!row) return null

    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      tipo_corretor: row.tipo_corretor,
      is_plantonista: true,
      sla_minutos: 0,
      motivo_atribuicao: 'fallback_plantonista',
      expira_em: null,
    }
  },
}

import type { DistributionStrategy, DistributionStrategyContext, DistributionStrategyResult } from './types'

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Nível 4 — fallback final: corretor/atendente de plantão (is_plantonista=true), priorizando
 * quem atua na mesma área do lead quando existir, senão o de menor carga globalmente. Sempre
 * roda por último e sempre com atribuição definitiva (sem expiração) — é o "ninguém mais
 * disponível, alguém tem que ficar responsável" da cascata.
 *
 * config opcional (mesmos campos e defaults de geoAreaStrategy — só usado aqui pra
 * desempate de prioridade, não como filtro obrigatório):
 *   { sellerAreaTable, sellerAreaFk, sellerEstadoColumn, sellerCidadeColumn }
 */
export const plantonistaFallbackStrategy: DistributionStrategy = {
  key: 'plantonista_fallback',

  async findCandidate(ctx: DistributionStrategyContext): Promise<DistributionStrategyResult | null> {
    const {
      sellerAreaTable = 'atendente_area_atuacao',
      sellerAreaFk = 'corretor_fk',
      sellerEstadoColumn = 'estado_fk',
      sellerCidadeColumn = 'cidade_fk',
    } = ctx.config || {}

    for (const ident of [sellerAreaTable, sellerAreaFk, sellerEstadoColumn, sellerCidadeColumn]) {
      if (!IDENT_RE.test(ident)) {
        console.warn(`[plantonistaFallbackStrategy] identificador inválido na config: "${ident}"`)
        return null
      }
    }

    const q = `
      SELECT u.id, u.nome, u.email, u.tipo_corretor, u.is_plantonista
      FROM public.users u
      INNER JOIN public.user_tenant_membership utm ON u.id = utm.user_id
      INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
      INNER JOIN public.user_roles ur ON ura.role_id = ur.id
      LEFT JOIN public."${sellerAreaTable}" caa ON caa."${sellerAreaFk}" = u.id
      LEFT JOIN (
         SELECT corretor_fk, created_at FROM public.imovel_prospect_atribuicoes
         UNION ALL
         SELECT corretor_atribuido_id as corretor_fk, created_at FROM public.leads_staging WHERE corretor_atribuido_id IS NOT NULL
      ) a ON a.corretor_fk = u.id
      WHERE u.ativo = true
        -- Ausência temporária (férias/atestado) tira até o plantonista da fila — plantão de
        -- alguém de licença não é plantão. Ver docs/PLANO_PENDENCIA_ATENDIMENTO.md §4.1.
        AND (u.indisponivel_ate IS NULL OR u.indisponivel_ate <= now())
        AND utm.tenant_id = $4
        AND ur.name = $5
        AND COALESCE(u.is_plantonista, false) = true
        AND (CASE WHEN array_length($1::uuid[], 1) > 0 THEN u.id != ALL($1::uuid[]) ELSE true END)
      GROUP BY u.id, u.nome, u.email, u.tipo_corretor, u.is_plantonista, u.created_at, caa."${sellerEstadoColumn}", caa."${sellerCidadeColumn}"
      ORDER BY
        (CASE WHEN caa."${sellerEstadoColumn}" = $2 AND caa."${sellerCidadeColumn}" = $3 THEN 0 ELSE 1 END) ASC,
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

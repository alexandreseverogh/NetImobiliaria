import type { DistributionStrategy, DistributionStrategyContext, DistributionStrategyResult } from './types'

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Nível 2/3 — roteamento geográfico por área de atuação, com round-robin (menos leads
 * recebidos primeiro) e prioridade Externo → Interno. config esperado:
 *   { limitExternal, limitInternal, slaExterno, slaInterno }  (resolvido pelo engine a
 *     partir de parametros_imoveis, tenant-wide)
 *   { sellerAreaTable, sellerAreaFk, sellerEstadoColumn, sellerCidadeColumn }  (opcionais —
 *     de qual tabela/colunas vem a área de atuação do vendedor; default preserva o
 *     comportamento histórico: atendente_area_atuacao/corretor_fk/estado_fk/cidade_fk)
 * Sem estado_fk/cidade_fk no contexto do lead, a estratégia é pulada.
 */
export const geoAreaStrategy: DistributionStrategy = {
  key: 'geo_area',

  async findCandidate(ctx: DistributionStrategyContext): Promise<DistributionStrategyResult | null> {
    if (!ctx.estadoFk || !ctx.cidadeFk) return null

    const {
      limitExternal = 3, limitInternal = 3, slaExterno = 5, slaInterno = 15,
      sellerAreaTable = 'atendente_area_atuacao',
      sellerAreaFk = 'corretor_fk',
      sellerEstadoColumn = 'estado_fk',
      sellerCidadeColumn = 'cidade_fk',
    } = ctx.config || {}

    for (const ident of [sellerAreaTable, sellerAreaFk, sellerEstadoColumn, sellerCidadeColumn]) {
      if (!IDENT_RE.test(ident)) {
        console.warn(`[geoAreaStrategy] identificador inválido na config: "${ident}"`)
        return null
      }
    }
    const areaCfg = { sellerAreaTable, sellerAreaFk, sellerEstadoColumn, sellerCidadeColumn }

    const externo = await queryBrokersByArea(ctx, 'Externo', limitExternal, areaCfg)
    if (externo) return format(externo, 'area_match_externo', slaExterno, slaInterno)

    const interno = await queryBrokersByArea(ctx, 'Interno', limitInternal, areaCfg)
    if (interno) return format(interno, 'area_match_interno', slaExterno, slaInterno)

    return null
  },
}

interface AreaTableConfig {
  sellerAreaTable: string
  sellerAreaFk: string
  sellerEstadoColumn: string
  sellerCidadeColumn: string
}

async function queryBrokersByArea(
  ctx: DistributionStrategyContext,
  tipo: 'Externo' | 'Interno',
  limit: number,
  areaCfg: AreaTableConfig,
): Promise<any | null> {
  const { sellerAreaTable, sellerAreaFk, sellerEstadoColumn, sellerCidadeColumn } = areaCfg
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
    INNER JOIN public."${sellerAreaTable}" caa ON caa."${sellerAreaFk}" = u.id
    LEFT JOIN public.corretor_scores cs ON cs.user_id = u.id
    LEFT JOIN (
      SELECT corretor_fk, created_at FROM public.imovel_prospect_atribuicoes
      UNION ALL
      SELECT corretor_atribuido_id as corretor_fk, created_at FROM public.leads_staging WHERE corretor_atribuido_id IS NOT NULL
    ) a ON a.corretor_fk = u.id
    WHERE u.ativo = true
      AND utm.tenant_id = $6
      AND ur.name = $7
      AND COALESCE(u.is_plantonista, false) = false
      AND u.tipo_corretor = $1
      AND caa."${sellerEstadoColumn}" = $2
      AND caa."${sellerCidadeColumn}" = $3
      AND (CASE WHEN array_length($4::uuid[], 1) > 0 THEN u.id != ALL($4::uuid[]) ELSE true END)
    GROUP BY u.id, u.nome, u.email, u.tipo_corretor, u.is_plantonista, cs.nivel, u.created_at
    HAVING COUNT(a.corretor_fk) < $5
    ORDER BY
      COUNT(a.corretor_fk) ASC,
      MAX(a.created_at) ASC NULLS FIRST,
      COALESCE(cs.nivel, 0) DESC,
      u.created_at ASC
    LIMIT 1
  `
  const r = await ctx.dbClient.query(q, [tipo, ctx.estadoFk, ctx.cidadeFk, ctx.excludeIds, limit, ctx.tenantId, ctx.sellerRoleName])
  return r.rows[0] || null
}

function format(row: any, motivo: string, slaExt: number, slaInt: number): DistributionStrategyResult {
  const sla = row.tipo_corretor === 'Externo' ? slaExt : slaInt
  const expiraEm = new Date()
  expiraEm.setMinutes(expiraEm.getMinutes() + sla)
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    tipo_corretor: row.tipo_corretor,
    is_plantonista: row.is_plantonista,
    sla_minutos: sla,
    motivo_atribuicao: motivo,
    expira_em: expiraEm,
  }
}

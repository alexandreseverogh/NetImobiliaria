import type { DistributionStrategy, DistributionStrategyContext, DistributionStrategyResult } from './types'

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

/**
 * Nível 1 — dono do ativo (ex.: corretor fixo do imóvel). config esperado:
 *   { targetTable: 'imoveis', targetIdColumn: 'id', ownerColumn: 'corretor_fk' }
 * Sem os 3 campos configurados (ou com identificador inválido), a estratégia é pulada
 * silenciosamente — não é erro, só significa que este segmento não tem essa noção de "dono".
 * Atribuição por este nível é definitiva (sem expiração) — mesma regra de sempre.
 */
export const ownerOfAssetStrategy: DistributionStrategy = {
  key: 'owner_of_asset',

  async findCandidate(ctx: DistributionStrategyContext): Promise<DistributionStrategyResult | null> {
    let ownerId: string | undefined = ctx.sourceOwnerId

    if (!ownerId) {
      const { targetTable, targetIdColumn, ownerColumn } = ctx.config || {}
      if (!ctx.targetId || !targetTable || !targetIdColumn || !ownerColumn) return null
      if (!IDENT_RE.test(targetTable) || !IDENT_RE.test(targetIdColumn) || !IDENT_RE.test(ownerColumn)) {
        console.warn(`[ownerOfAssetStrategy] identificador inválido na config: ${JSON.stringify(ctx.config)}`)
        return null
      }

      const targetRes = await ctx.dbClient.query(
        `SELECT "${ownerColumn}" AS owner_id FROM public."${targetTable}" WHERE "${targetIdColumn}" = $1`,
        [ctx.targetId],
      )
      ownerId = targetRes.rows[0]?.owner_id
    }

    if (!ownerId || ctx.excludeIds.includes(ownerId)) return null

    const ownerRes = await ctx.dbClient.query(
      `SELECT u.id, u.nome, u.email, u.tipo_corretor, u.is_plantonista
         FROM public.users u
         INNER JOIN public.user_tenant_membership utm ON u.id = utm.user_id
        WHERE u.id = $1 AND u.ativo = true AND utm.tenant_id = $2`,
      [ownerId, ctx.tenantId],
    )
    const row = ownerRes.rows[0]
    if (!row) return null

    return {
      id: row.id,
      nome: row.nome,
      email: row.email,
      tipo_corretor: row.tipo_corretor,
      is_plantonista: row.is_plantonista,
      sla_minutos: 0,
      motivo_atribuicao: 'dono_ativo',
      expira_em: null,
    }
  },
}

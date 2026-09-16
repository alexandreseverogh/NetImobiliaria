import pool from '@/lib/database/connection'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'
import type { Segment } from '@/lib/intelligence/segmentResolver'

/**
 * Resolução de config efetiva de um agente (tenant override > default do segmento) —
 * extraído do runner.ts (F1/F2) pra ser reaproveitado também por agentes ON_STAGE_CHANGE/
 * sob-demanda (F3 next_best_action), que resolvem 1 lead por vez e não precisam do cache
 * por-rodada-de-scan que o runner mantém pra si.
 */
export interface EffectiveAgentConfig {
  ativo: boolean
  params: Record<string, any>
  segment: Segment
}

export async function resolveEffectiveAgentConfig(
  agentKey: string,
  tenantId: string,
  clientId: string | null,
): Promise<EffectiveAgentConfig | null> {
  const segment: Segment | null = await resolveSegment(tenantId, clientId)
  if (!segment) return null

  const [tenantRow, segmentRow] = await Promise.all([
    pool.query(
      `SELECT ativo, params FROM public.crm_agentes_config_tenant WHERE tenant_id = $1::uuid AND agent_key = $2`,
      [tenantId, agentKey],
    ),
    pool.query(
      `SELECT ativo, params FROM public.crm_agentes_config_segmento WHERE segment_id = $1::uuid AND agent_key = $2`,
      [segment.id, agentKey],
    ),
  ])

  const tenantCfg = tenantRow.rows[0]
  const segmentCfg = segmentRow.rows[0]

  // ativo: override do tenant (quando não-NULL) tem prioridade; senão herda do segmento.
  const ativo = tenantCfg?.ativo != null ? tenantCfg.ativo : (segmentCfg?.ativo ?? false)
  // params: merge raso, tenant sobrepõe campo a campo o que o segmento já definiu.
  const params = { ...(segmentCfg?.params ?? {}), ...(tenantCfg?.params ?? {}) }

  return { ativo, params, segment }
}

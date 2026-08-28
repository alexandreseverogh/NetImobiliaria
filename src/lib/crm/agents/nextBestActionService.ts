import pool from '@/lib/database/connection'
import { resolveEffectiveAgentConfig } from './effectiveConfig'
import { nextBestActionAgent } from './nextBestActionAgent'

const AGENT_KEY = 'next_best_action'

export interface NextBestActionSuggestion {
  title: string
  description: string
  createdAt: string
}

export interface NextBestActionState {
  /** Se o agente está ativo pra este tenant/segmento (config efetiva) — quando false, a UI
   *  nunca deve oferecer "Atualizar sugestão" nem fingir que há recomendação nenhuma. */
  enabled: boolean
  suggestion: NextBestActionSuggestion | null
}

/** Última sugestão já persistida (sem chamar LLM) — usado no carregamento da ficha do lead. */
export async function getLatestNextBestAction(
  tenantId: string,
  leadUuid: string,
  clientId: string | null,
): Promise<NextBestActionState> {
  const cfg = await resolveEffectiveAgentConfig(AGENT_KEY, tenantId, clientId)
  const enabled = !!cfg?.ativo

  const { rows } = await pool.query(
    `SELECT title, description, created_at FROM public.crm_agent_actions
      WHERE tenant_id = $1::uuid AND lead_uuid = $2::uuid AND agent_key = $3
      ORDER BY created_at DESC LIMIT 1`,
    [tenantId, leadUuid, AGENT_KEY],
  )
  const row = rows[0]
  return {
    enabled,
    suggestion: row ? { title: row.title, description: row.description, createdAt: row.created_at } : null,
  }
}

/** Gera uma sugestão nova via LLM e persiste — usado tanto no trigger ON_STAGE_CHANGE
 *  (best-effort, disparado por /api/crm/kanban/move) quanto no botão "Atualizar sugestão". */
export async function refreshNextBestAction(
  tenantId: string,
  leadUuid: string,
  clientId: string | null,
): Promise<NextBestActionState> {
  const cfg = await resolveEffectiveAgentConfig(AGENT_KEY, tenantId, clientId)
  if (!cfg || !cfg.ativo) return { enabled: false, suggestion: null }

  const result = await nextBestActionAgent.evaluate({
    tenantId,
    leadUuid,
    clientId,
    segment: cfg.segment,
    params: cfg.params,
  })
  if (!result?.shouldFire) return { enabled: true, suggestion: null }

  const { rows } = await pool.query(
    `INSERT INTO public.crm_agent_actions
       (tenant_id, lead_uuid, agent_key, type, title, description, confidence, status)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, 'NOTIFIED')
     RETURNING title, description, created_at`,
    [tenantId, leadUuid, AGENT_KEY, result.type, result.title, result.description, result.confidence],
  )
  const row = rows[0]
  return {
    enabled: true,
    suggestion: { title: row.title, description: row.description, createdAt: row.created_at },
  }
}

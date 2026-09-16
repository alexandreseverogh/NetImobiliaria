import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { requireMaster } from '@/lib/crm/agents/debugAuth'
import { resolveEffectiveAgentConfig } from '@/lib/crm/agents/effectiveConfig'
import { CRM_AGENTS } from '@/lib/crm/agents/index'
import { refreshNextBestAction } from '@/lib/crm/agents/nextBestActionService'

/**
 * Dry-run puro — nunca grava crm_agent_actions, nunca notifica. Só chama agent.evaluate(ctx)
 * (que já é sempre sem efeito colateral nos 3 agentes lead-scoped) e devolve o resultado bruto
 * pro painel decidir se registra de verdade (POST .../commit).
 *
 * `next_best_action` é a exceção deliberada: é INFORMATIVE, nunca fala com o lead, e o próprio
 * fluxo real (POST /api/crm/kanban/move) já chama refreshNextBestAction sem gate nenhum — não
 * há "dry-run" que faça sentido pra ele, o painel só chama o serviço real direto.
 */
export async function POST(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied

  const { tenantId, leadUuid, agentKey } = await request.json() as {
    tenantId?: string; leadUuid?: string; agentKey?: string
  }
  if (!tenantId || !leadUuid || !agentKey) {
    return NextResponse.json({ error: 'tenantId, leadUuid e agentKey são obrigatórios' }, { status: 400 })
  }

  const { rows: leadRows } = await pool.query(
    `SELECT client_id FROM public.leads_staging WHERE lead_uuid = $1::uuid AND tenant_id = $2::uuid`,
    [leadUuid, tenantId],
  )
  if (!leadRows[0]) return NextResponse.json({ error: 'Lead não encontrado neste tenant' }, { status: 404 })
  const clientId: string | null = leadRows[0].client_id

  if (agentKey === 'next_best_action') {
    const suggestion = await refreshNextBestAction(tenantId, leadUuid, clientId)
    return NextResponse.json({ mode: 'commit-direto', result: suggestion })
  }

  const agent = CRM_AGENTS[agentKey]
  if (!agent) return NextResponse.json({ error: `Agente "${agentKey}" desconhecido` }, { status: 400 })

  const cfg = await resolveEffectiveAgentConfig(agentKey, tenantId, clientId)
  if (!cfg) return NextResponse.json({ error: 'Não foi possível resolver o segmento deste tenant' }, { status: 400 })

  const result = await agent.evaluate({ tenantId, leadUuid, clientId, segment: cfg.segment, params: cfg.params })
  return NextResponse.json({ mode: 'dry-run', ativo: cfg.ativo, params: cfg.params, result })
}

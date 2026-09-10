import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { requireMaster } from '@/lib/crm/agents/debugAuth'
import { resolveEffectiveAgentConfig } from '@/lib/crm/agents/effectiveConfig'
import { CRM_AGENTS } from '@/lib/crm/agents/index'
import { recordAction, notifyForResult } from '@/lib/crm/agents/runner'
import type { CrmAgentResult } from '@/lib/crm/agents/types'

/**
 * "Registrar e notificar" — usa o MESMO resultado que .../evaluate já devolveu (nunca chama o
 * LLM de novo, pra não arriscar um texto diferente do que o painel mostrou) e reproduz
 * exatamente o miolo do runner.ts pra 1 candidato: recordAction → agent.execute?() →
 * notifyForResult (sempre 1:1, nunca o caminho de digest — é demo de 1 lead por vez).
 */
export async function POST(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied

  const { tenantId, leadUuid, agentKey, result } = await request.json() as {
    tenantId?: string; leadUuid?: string; agentKey?: string; result?: CrmAgentResult
  }
  if (!tenantId || !leadUuid || !agentKey || !result) {
    return NextResponse.json({ error: 'tenantId, leadUuid, agentKey e result são obrigatórios' }, { status: 400 })
  }

  const { rows: leadRows } = await pool.query(
    `SELECT client_id FROM public.leads_staging WHERE lead_uuid = $1::uuid AND tenant_id = $2::uuid`,
    [leadUuid, tenantId],
  )
  if (!leadRows[0]) return NextResponse.json({ error: 'Lead não encontrado neste tenant' }, { status: 404 })
  const clientId: string | null = leadRows[0].client_id

  const agent = CRM_AGENTS[agentKey]
  if (!agent) return NextResponse.json({ error: `Agente "${agentKey}" desconhecido` }, { status: 400 })

  const cfg = await resolveEffectiveAgentConfig(agentKey, tenantId, clientId)
  if (!cfg) return NextResponse.json({ error: 'Não foi possível resolver o segmento deste tenant' }, { status: 400 })

  const actionId = await recordAction(agentKey, tenantId, leadUuid, result)

  let resumoExecucao: string | null = null
  if (agent.execute) {
    try {
      resumoExecucao = await agent.execute(
        { tenantId, leadUuid, clientId, segment: cfg.segment, params: cfg.params },
        result,
        actionId,
      )
    } catch (err) {
      console.error(`[crm-agentes-debug] execute() falhou pra ${agentKey}/${leadUuid}:`, err)
    }
  }

  await notifyForResult(tenantId, leadUuid, result, actionId, resumoExecucao)

  return NextResponse.json({ actionId, resumoExecucao })
}

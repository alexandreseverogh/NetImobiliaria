/**
 * Grava a ação real do stage_stagnation (mesmo INSERT de recordAction() em runner.ts) e
 * notifica via WhatsApp real — escopado a UM lead específico, nunca findCandidates()/scan.
 */
import { randomUUID } from 'crypto'
import pool from '../src/lib/database/connection'
import { notifyWhatsApp, notifySlack } from '../src/lib/marketing/services/agentNotificador'
import { resolveEffectiveAgentConfig } from '../src/lib/crm/agents/effectiveConfig'
import { stageStagnationAgent } from '../src/lib/crm/agents/stageStagnationAgent'

const TENANT_ID = 'c3fc15b7-7033-4e13-8e24-951c2e087dfb' // CRM SOZINHO
const LEAD_UUID = '75b3d95e-108a-4129-bdc7-06dc8aea1ff4' // TESTE ROTEIRO CRM - Agente Pendencia

async function main() {
  const cfg = await resolveEffectiveAgentConfig('stage_stagnation', TENANT_ID, null)
  if (!cfg || !cfg.ativo) { console.log('Agente inativo.'); process.exit(0) }

  const result = await stageStagnationAgent.evaluate({
    tenantId: TENANT_ID, leadUuid: LEAD_UUID, clientId: null, segment: cfg.segment, params: cfg.params,
  })
  if (!result?.shouldFire) { console.log('shouldFire=false:', result); process.exit(0) }

  const actionId = randomUUID()
  await pool.query(
    `INSERT INTO public.crm_agent_actions
       (id, tenant_id, lead_uuid, agent_key, type, title, description, suggested_message,
        confidence, status, approval_pin, approval_pin_exp, payload)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)`,
    [actionId, TENANT_ID, LEAD_UUID, 'stage_stagnation', result.type, result.title, result.description,
     null, result.confidence, 'NOTIFIED', null, null, '{}'],
  )
  console.log('--- crm_agent_actions gravado ---', { actionId, title: result.title })

  const msg = `⏱️ ${result.title}\n${result.description}\n\n[TESTE ROTEIRO CRM — stage_stagnation]`
  await notifyWhatsApp(msg, TENANT_ID)
  await notifySlack(msg, TENANT_ID)
  console.log('Notificação enviada. Confira o WhatsApp.')
  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })

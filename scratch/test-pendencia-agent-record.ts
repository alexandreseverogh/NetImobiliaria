/**
 * Continuação do dry-run: agora grava a ação real (mesmo INSERT de recordAction() em
 * runner.ts) e chama notifyForResult() equivalente — escopado a UM lead específico.
 * NUNCA chama findCandidates() nem o endpoint de scan.
 */
import { randomUUID } from 'crypto'
import pool from '../src/lib/database/connection'
import { notifyWhatsApp, notifySlack } from '../src/lib/marketing/services/agentNotificador'
import { resolveEffectiveAgentConfig } from '../src/lib/crm/agents/effectiveConfig'
import { pendenciaAtendimentoAgent } from '../src/lib/crm/agents/pendenciaAtendimentoAgent'

const TENANT_ID = 'c3fc15b7-7033-4e13-8e24-951c2e087dfb' // CRM SOZINHO
const LEAD_UUID = '75b3d95e-108a-4129-bdc7-06dc8aea1ff4' // TESTE ROTEIRO CRM - Agente Pendencia

async function main() {
  const cfg = await resolveEffectiveAgentConfig('pendencia_atendimento', TENANT_ID, null)
  if (!cfg || !cfg.ativo) {
    console.log('Agente inativo — nada a fazer.')
    process.exit(0)
  }

  const result = await pendenciaAtendimentoAgent.evaluate({
    tenantId: TENANT_ID,
    leadUuid: LEAD_UUID,
    clientId: null,
    segment: cfg.segment,
    params: cfg.params,
  })

  if (!result?.shouldFire) {
    console.log('evaluate() retornou shouldFire=false — nada a gravar. Resultado:', result)
    process.exit(0)
  }

  // Mesmo INSERT de recordAction() em src/lib/crm/agents/runner.ts
  const isOffensive = result.type === 'OFFENSIVE'
  const pin = isOffensive ? Math.floor(100000 + Math.random() * 900000).toString() : null
  const pinExp = isOffensive ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null
  const status = isOffensive ? 'PENDING_APPROVAL' : 'NOTIFIED'
  const actionId = randomUUID()

  await pool.query(
    `INSERT INTO public.crm_agent_actions
       (id, tenant_id, lead_uuid, agent_key, type, title, description, suggested_message,
        confidence, status, approval_pin, approval_pin_exp, payload)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb)`,
    [actionId, TENANT_ID, LEAD_UUID, 'pendencia_atendimento', result.type, result.title, result.description,
     result.suggestedMessage ?? null, result.confidence, status, pin, pinExp,
     JSON.stringify(result.payload ?? {})],
  )
  console.log('--- crm_agent_actions gravado ---')
  console.log({ actionId, status, type: result.type, title: result.title })

  // execute() — só tem efeito real no degrau 3 (reatribuição); nos demais retorna null.
  let resumoExecucao: string | null = null
  if (pendenciaAtendimentoAgent.execute) {
    resumoExecucao = await pendenciaAtendimentoAgent.execute(
      { tenantId: TENANT_ID, leadUuid: LEAD_UUID, clientId: null, segment: cfg.segment, params: cfg.params },
      result,
      actionId,
    )
  }
  console.log('resumoExecucao:', resumoExecucao)

  // Notificação — mesmo texto de notifyForResult() (não-OFFENSIVE), mas SEM engolir o erro,
  // pra vermos exatamente o que aconteceu (ao contrário do runner real, que sempre faz .catch(()=>{})).
  const msg = `⏱️ ${result.title}\n${result.description}` +
    (resumoExecucao ? `\n\n🤖 Ação automática: ${resumoExecucao}` : '')
  console.log('\n--- Tentando notificar (WhatsApp) ---')
  try {
    await notifyWhatsApp(msg, TENANT_ID)
    console.log('notifyWhatsApp: chamada concluída sem lançar exceção (ver log acima se tentou rede de verdade).')
  } catch (e) {
    console.log('notifyWhatsApp lançou erro:', e)
  }
  await notifySlack(msg, TENANT_ID)
  console.log('notifySlack: no-op (desativado por decisão do usuário, 2026-09-01).')

  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

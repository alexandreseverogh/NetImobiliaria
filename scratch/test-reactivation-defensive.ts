/**
 * Teste isolado do agente reactivation — caminho DEFENSIVE (sem requer_revisao_extra),
 * escopado a UM lead específico. Nunca chama findCandidates()/scan.
 *
 * Simula: nós respondemos o lead (bola_com='cliente') e ele nunca mais respondeu, há dias.
 */
import { randomUUID } from 'crypto'
import pool from '../src/lib/database/connection'
import { notifyWhatsApp, notifySlack } from '../src/lib/marketing/services/agentNotificador'
import { resolveEffectiveAgentConfig } from '../src/lib/crm/agents/effectiveConfig'
import { reactivationAgent } from '../src/lib/crm/agents/reactivationAgent'

const TENANT_ID = 'c3fc15b7-7033-4e13-8e24-951c2e087dfb' // CRM SOZINHO
const LEAD_UUID = '11111111-2222-3333-4444-555555555001' // dedicado a este teste

async function main() {
  // 1. Cria o lead de teste direto (sem passar por qualificação — não é o foco aqui).
  await pool.query(
    `INSERT INTO public.leads_staging
       (lead_uuid, tenant_id, nome, telefone, tag_sonho, resumo_ia, score_prontidao, score_fit,
        bola_com, bola_desde, created_at)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, 'cliente', now() - interval '3 days', now())
     ON CONFLICT (lead_uuid) DO UPDATE SET bola_com='cliente', bola_desde = now() - interval '3 days'`,
    [LEAD_UUID, TENANT_ID, 'TESTE ROTEIRO CRM - Reativação DEFENSIVE', '5581998000047',
     'troca', 'Lead interessado em sedan usado, aguardando retorno há dias', 70, 60],
  )
  console.log('--- Lead de teste criado/atualizado ---')

  const cfg = await resolveEffectiveAgentConfig('reactivation', TENANT_ID, null)
  if (!cfg || !cfg.ativo) { console.log('Agente inativo.'); process.exit(0) }

  // Override local só de dias_inatividade — nunca toca na tabela de config compartilhada.
  const params = { ...cfg.params, dias_inatividade: '1', requer_revisao_extra: 'false' }

  const result = await reactivationAgent.evaluate({
    tenantId: TENANT_ID, leadUuid: LEAD_UUID, clientId: null, segment: cfg.segment, params,
  })
  console.log('\n--- Resultado do evaluate() ---')
  console.log(JSON.stringify(result, null, 2))
  if (!result?.shouldFire) process.exit(0)

  // 2. Grava a ação (mesmo padrão de recordAction() em runner.ts).
  const actionId = randomUUID()
  await pool.query(
    `INSERT INTO public.crm_agent_actions
       (id, tenant_id, lead_uuid, agent_key, type, title, description, suggested_message,
        confidence, status, approval_pin, approval_pin_exp, payload)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, 'NOTIFIED', null, null, '{}'::jsonb)`,
    [actionId, TENANT_ID, LEAD_UUID, 'reactivation', result.type, result.title, result.description,
     result.suggestedMessage, result.confidence],
  )
  console.log('--- crm_agent_actions gravado (NOTIFIED) ---', actionId)

  // 3. Executa (envio automático real — mesmo caminho do execute() do agente).
  const resumoExecucao = await reactivationAgent.execute!(
    { tenantId: TENANT_ID, leadUuid: LEAD_UUID, clientId: null, segment: cfg.segment, params },
    result, actionId,
  )
  console.log('\n--- Resultado do execute() (envio automático) ---')
  console.log(resumoExecucao)

  const { rows: statusRows } = await pool.query(
    `SELECT status, executed_at FROM public.crm_agent_actions WHERE id = $1::uuid`, [actionId],
  )
  console.log('\n--- Status final da ação ---', statusRows[0])

  // 4. Notifica o tenant (best-effort), avisando o que a máquina fez sozinha.
  const msg = `⏱️ ${result.title}\n${result.description}` +
    (resumoExecucao ? `\n\n🤖 Ação automática: ${resumoExecucao}` : '') +
    `\n\n[TESTE ROTEIRO CRM — reactivation DEFENSIVE]`
  await notifyWhatsApp(msg, TENANT_ID)
  await notifySlack(msg, TENANT_ID)
  console.log('\nNotificação de digest enviada.')
  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })

/**
 * Teste isolado do agente reactivation — caminho OFFENSIVE (requer_revisao_extra=true),
 * escopado a leads dedicados. Nunca chama findCandidates()/scan.
 *
 * Cobre: PIN errado → reformulário; PIN certo (com edição do texto) → aprova e envia de
 * verdade; rejeição → REJECTED, nada enviado.
 */
import { randomUUID } from 'crypto'
import pool from '../src/lib/database/connection'
import { reactivationAgent } from '../src/lib/crm/agents/reactivationAgent'
import { resolveEffectiveAgentConfig } from '../src/lib/crm/agents/effectiveConfig'

const TENANT_ID = 'c3fc15b7-7033-4e13-8e24-951c2e087dfb' // CRM SOZINHO
const LEAD_APPROVE = '11111111-2222-3333-4444-555555555002'
const LEAD_REJECT = '11111111-2222-3333-4444-555555555003'
const BASE_URL = 'http://localhost:3000'

async function makeAction(leadUuid: string, nome: string) {
  await pool.query(
    `INSERT INTO public.leads_staging
       (lead_uuid, tenant_id, nome, telefone, tag_sonho, resumo_ia, score_prontidao, score_fit,
        bola_com, bola_desde, created_at)
     VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, 'cliente', now() - interval '5 days', now())
     ON CONFLICT (lead_uuid) DO UPDATE SET bola_com='cliente', bola_desde = now() - interval '5 days'`,
    [leadUuid, TENANT_ID, nome, '5581998000047', 'financiamento',
     'Lead interessado em SUV, aguardando simulação de financiamento', 65, 55],
  )

  const cfg = await resolveEffectiveAgentConfig('reactivation', TENANT_ID, null)
  if (!cfg) throw new Error('sem config')
  const params = { ...cfg.params, dias_inatividade: '1', requer_revisao_extra: 'true' }

  const result = await reactivationAgent.evaluate({
    tenantId: TENANT_ID, leadUuid, clientId: null, segment: cfg.segment, params,
  })
  if (!result?.shouldFire) throw new Error('evaluate não disparou: ' + JSON.stringify(result))
  console.log(`\n--- evaluate() ${nome} ---`)
  console.log(JSON.stringify(result, null, 2))

  const actionId = randomUUID()
  const pin = Math.floor(100000 + Math.random() * 900000).toString()
  await pool.query(
    `INSERT INTO public.crm_agent_actions
       (id, tenant_id, lead_uuid, agent_key, type, title, description, suggested_message,
        confidence, status, approval_pin, approval_pin_exp, payload)
     VALUES ($1::uuid, $2::uuid, $3::uuid, 'reactivation', $4, $5, $6, $7, $8,
             'PENDING_APPROVAL', $9, now() + interval '24 hours', '{}'::jsonb)`,
    [actionId, TENANT_ID, leadUuid, result.type, result.title, result.description,
     result.suggestedMessage, result.confidence, pin],
  )
  console.log(`actionId=${actionId} pin=${pin}`)
  return { actionId, pin, suggestedMessage: result.suggestedMessage }
}

async function main() {
  // --- Caminho 1: aprovar (PIN errado primeiro, depois certo, com edição) ---
  const a1 = await makeAction(LEAD_APPROVE, 'TESTE ROTEIRO CRM - Reativação OFFENSIVE (aprovar)')

  console.log('\n--- POST approve com PIN ERRADO ---')
  const wrongRes = await fetch(`${BASE_URL}/api/crm/agent/approve/${a1.actionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ pin: '000000', mensagem: a1.suggestedMessage || '' }).toString(),
  })
  console.log('status:', wrongRes.status)
  const wrongHtml = await wrongRes.text()
  console.log('contém "PIN incorreto"?', wrongHtml.includes('PIN incorreto'))

  const { rows: statusAfterWrong } = await pool.query(
    `SELECT status FROM public.crm_agent_actions WHERE id = $1::uuid`, [a1.actionId],
  )
  console.log('status no banco após PIN errado (deve continuar PENDING_APPROVAL):', statusAfterWrong[0].status)

  console.log('\n--- POST approve com PIN CERTO + texto editado ---')
  const editedMsg = (a1.suggestedMessage || '') + ' [texto editado no momento da aprovação]'
  const okRes = await fetch(`${BASE_URL}/api/crm/agent/approve/${a1.actionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ pin: a1.pin, mensagem: editedMsg }).toString(),
  })
  console.log('status:', okRes.status)
  const okHtml = await okRes.text()
  console.log('contém "Reativação enviada"?', okHtml.includes('Reativação enviada'))
  console.log('contém "envio falhou"?', okHtml.includes('envio falhou'))

  const { rows: finalRow } = await pool.query(
    `SELECT status, suggested_message, executed_at FROM public.crm_agent_actions WHERE id = $1::uuid`, [a1.actionId],
  )
  console.log('\n--- Estado final da ação aprovada ---')
  console.log(finalRow[0])
  console.log('texto final bate com o EDITADO (não o original)?', finalRow[0].suggested_message === editedMsg)

  // --- Caminho 2: rejeitar ---
  const a2 = await makeAction(LEAD_REJECT, 'TESTE ROTEIRO CRM - Reativação OFFENSIVE (rejeitar)')
  console.log('\n--- POST reject ---')
  const rejRes = await fetch(`${BASE_URL}/api/crm/agent/reject/${a2.actionId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ pin: a2.pin }).toString(),
  })
  console.log('status:', rejRes.status)
  const { rows: rejRow } = await pool.query(
    `SELECT status FROM public.crm_agent_actions WHERE id = $1::uuid`, [a2.actionId],
  )
  console.log('status no banco (deve ser REJECTED):', rejRow[0].status)

  // Confirma que a mensagem NUNCA foi enviada pro lead rejeitado (nenhum contato/conversa novo)
  const { rows: contactCheck } = await pool.query(
    `SELECT count(*) FROM mensageria.contacts WHERE phone = '5581998000047' AND tenant_id = $1::uuid`,
    [TENANT_ID],
  )
  console.log('contatos com este telefone no tenant (esperado: 1, o mesmo já usado antes — nenhum extra criado pro rejeitado):', contactCheck[0].count)

  process.exit(0)
}

main().catch((err) => { console.error(err); process.exit(1) })

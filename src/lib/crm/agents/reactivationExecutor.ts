import pool from '@/lib/database/connection'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'
import { resolveEffectiveAgentConfig } from './effectiveConfig'
import { resolveWhatsAppInbox } from '@/lib/mensageria/inboxes'
import { ingestMessage } from '@/lib/mensageria/ingest'
import { sendEvolutionMessage, type EvolutionInboxConfig } from '@/lib/mensageria/channels/evolutionSend'
import { logAiAtividade } from '@/lib/crm/atividades/logAiAtividade'

/**
 * F4 — lógica compartilhada de aprovação/rejeição do agente `reactivation`
 * (docs/PLANO_AGENTES_ACELERACAO_CRM.md §5). Usada por 2 superfícies diferentes que só
 * variam em COMO o usuário se autentica — a decisão em si é idêntica:
 *   - src/app/api/crm/agent/approve|reject/[id]/route.ts — link de WhatsApp + PIN de 6
 *     dígitos, sem sessão (mesmo padrão já validado em produção pelos agentes de Campanhas).
 *   - src/app/api/crm/agent/approvals/route.ts — aba "Aprovações Pendentes" dentro do CRM
 *     autenticado, sem PIN (a sessão JWT já é a prova de identidade).
 *
 * O "envio" real reaproveita a infra já provada da Mensageria (resolveWhatsAppInbox +
 * ingestMessage + sendEvolutionMessage — o mesmo trio que o bot usa pra responder de
 * verdade no WhatsApp) em vez de inventar um canal de saída novo só pra este agente.
 */

export interface ReactivationAction {
  id: string
  tenantId: string
  leadUuid: string
  clientId: string | null
  leadNome: string | null
  leadTelefone: string | null
  title: string
  description: string
  suggestedMessage: string | null
  confidence: number
  status: string
  approvalPin: string | null
  approvalPinExp: string | null
  tenantName: string | null
}

export async function getReactivationAction(id: string): Promise<ReactivationAction | null> {
  const { rows } = await pool.query(
    `SELECT caa.id, caa.tenant_id, caa.lead_uuid, caa.title, caa.description,
            caa.suggested_message, caa.confidence, caa.status,
            caa.approval_pin, caa.approval_pin_exp,
            ls.nome AS lead_nome, ls.telefone AS lead_telefone, ls.client_id,
            t.name AS tenant_name
       FROM public.crm_agent_actions caa
       JOIN public.leads_staging ls ON ls.lead_uuid = caa.lead_uuid
       LEFT JOIN public.tenants t ON t.id = caa.tenant_id
      WHERE caa.id = $1::uuid AND caa.agent_key = 'reactivation'
      LIMIT 1`,
    [id],
  )
  const r = rows[0]
  if (!r) return null
  return {
    id: r.id,
    tenantId: r.tenant_id,
    leadUuid: r.lead_uuid,
    clientId: r.client_id,
    leadNome: r.lead_nome,
    leadTelefone: r.lead_telefone,
    title: r.title,
    description: r.description,
    suggestedMessage: r.suggested_message,
    confidence: r.confidence,
    status: r.status,
    approvalPin: r.approval_pin,
    approvalPinExp: r.approval_pin_exp,
    tenantName: r.tenant_name,
  }
}

async function setStatus(id: string, status: string, executedAt = false) {
  await pool.query(
    `UPDATE public.crm_agent_actions SET status = $1, executed_at = ${executedAt ? 'now()' : 'executed_at'} WHERE id = $2::uuid`,
    [status, id],
  )
}

export type ApproveResult =
  | { outcome: 'sent'; message: string }
  | { outcome: 'manual'; message: string }
  | { outcome: 'send_failed'; message: string; error: string }

/**
 * Aprova e — salvo requer_revisao_extra — envia de verdade via WhatsApp.
 * `editedMessage`: o humano pode revisar o rascunho antes de confirmar (plano §5: "aprovar
 * edita e envia") — sempre persistido em crm_agent_actions.suggested_message, mesmo quando
 * o envio automático está bloqueado (o rascunho revisado é o que fica disponível pra cópia
 * manual).
 */
export async function approveReactivation(id: string, editedMessage?: string | null): Promise<ApproveResult> {
  const action = await getReactivationAction(id)
  if (!action) throw new Error('Ação não encontrada')
  if (action.status !== 'PENDING_APPROVAL') throw new Error(`Status "${action.status}" não permite aprovação agora.`)

  const finalMessage = (editedMessage?.trim() || action.suggestedMessage || '').trim()
  if (!finalMessage) throw new Error('Mensagem de reativação vazia — nada para aprovar.')

  const segment = await resolveSegment(action.tenantId, action.clientId)
  const cfg = segment ? await resolveEffectiveAgentConfig('reactivation', action.tenantId, action.clientId) : null
  const requerRevisaoExtra = cfg?.params?.requer_revisao_extra === true || cfg?.params?.requer_revisao_extra === 'true'

  await pool.query(
    `UPDATE public.crm_agent_actions SET suggested_message = $1 WHERE id = $2::uuid`,
    [finalMessage, id],
  )

  if (requerRevisaoExtra) {
    // Segmento sensível (ex.: Saúde) — nunca envia sozinho, mesmo aprovado. Fica registrado
    // como aprovado (não confundir com PENDING_APPROVAL, que ainda aguarda decisão), pronto
    // pra cópia manual pelo atendente.
    await setStatus(id, 'APPROVED_MANUAL')
    return { outcome: 'manual', message: finalMessage }
  }

  return deliverReactivation(action, finalMessage)
}

/**
 * O envio real — compartilhado pelo caminho humano (approveReactivation) e pelo automático
 * (autoSendReactivation). Extraído em G6 pra que a decisão "quem autorizou" fique separada de
 * "como se entrega", e as duas nunca divirjam.
 */
async function deliverReactivation(action: ReactivationAction, finalMessage: string): Promise<ApproveResult> {
  if (!action.leadTelefone) {
    await setStatus(action.id, 'APPROVED_MANUAL')
    return { outcome: 'manual', message: finalMessage }
  }

  const inboxId = await resolveWhatsAppInbox(action.tenantId, action.clientId)
  const { rows: inboxRows } = await pool.query(
    `SELECT config FROM mensageria.inboxes WHERE id = $1`,
    [inboxId],
  )
  const config: EvolutionInboxConfig = inboxRows[0]?.config ?? {}

  const { messageId } = await ingestMessage({
    tenantId: action.tenantId,
    clientId: action.clientId,
    inboxId,
    contact: {
      name: action.leadNome,
      phone: action.leadTelefone.replace(/\D/g, ''),
    },
    direction: 'outbound',
    senderType: 'system',
    content: finalMessage,
  })

  const sendResult = await sendEvolutionMessage(config, action.leadTelefone, finalMessage)
  if (messageId) {
    await pool.query(
      `UPDATE mensageria.messages SET delivery_status = $1, external_id = COALESCE($2, external_id) WHERE id = $3`,
      [sendResult.ok ? 'sent' : 'failed', sendResult.externalId ?? null, messageId],
    )
  }

  await setStatus(action.id, 'EXECUTED', true)

  if (!sendResult.ok) {
    return { outcome: 'send_failed', message: finalMessage, error: sendResult.error || 'Falha desconhecida no envio' }
  }
  return { outcome: 'sent', message: finalMessage }
}

/**
 * G6 — Envio AUTOMÁTICO, sem fila de aprovação.
 *
 * Decisão do usuário (2026-08-08): "não espera decisão manual". A plataforma automatiza call
 * centers com grande número de atendentes; um humano aprovando cada mensagem de reativação é o
 * mesmo gargalo que os degraus internos já eliminaram.
 *
 * O freio que permanece é `requer_revisao_extra`, e ele deixa de ser "aprovar edita e envia"
 * para ser um bloqueio real de envio automático: segmento marcado assim nunca chega aqui — o
 * agente o classifica como OFFENSIVE e a ação fica em PENDING_APPROVAL, aguardando humano.
 * É a válvula para segmentos regulados (Saúde foi o exemplo do próprio usuário em F4), onde
 * mandar mensagem a paciente sem revisão tem risco de outra natureza.
 *
 * Chamado pelo runner via CrmAgent.execute(), logo depois da ação ser gravada.
 */
export async function autoSendReactivation(actionId: string): Promise<string> {
  const action = await getReactivationAction(actionId)
  if (!action) return 'ação de reativação não encontrada'

  const finalMessage = (action.suggestedMessage || '').trim()
  if (!finalMessage) {
    await setStatus(actionId, 'APPROVED_MANUAL')
    return 'rascunho vazio — nada enviado'
  }

  const result = await deliverReactivation(action, finalMessage)
  if (result.outcome === 'sent') {
    await logAiAtividade({
      leadUuid: action.leadUuid,
      tenantId: action.tenantId,
      clientId: action.clientId,
      descricao: `Reativação automática enviada via WhatsApp: "${finalMessage}"`,
    })
    return `mensagem de reativação enviada automaticamente para ${action.leadNome || 'o lead'}`
  }
  if (result.outcome === 'send_failed') return `falha ao enviar a reativação (${result.error}) — rascunho preservado`
  return 'lead sem telefone — rascunho guardado para envio manual'
}

export async function rejectReactivation(id: string): Promise<void> {
  const action = await getReactivationAction(id)
  if (!action) throw new Error('Ação não encontrada')
  if (action.status === 'REJECTED') return
  if (action.status !== 'PENDING_APPROVAL') throw new Error(`Status "${action.status}" não permite rejeição agora.`)
  await setStatus(id, 'REJECTED')
}

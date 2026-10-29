/**
 * Motor de SLA de mensageria (M3) — tempo de 1ª resposta e resolução.
 * Desacoplado do SLA de trabalho do lead (que já existe no CRM via
 * leads_staging.atribuicao_expira_em + cron de transbordo). Este mede
 * responsividade de ATENDIMENTO, não trabalho do lead.
 *
 * Simplificação assumida: os prazos NÃO pausam fora do horário comercial
 * (business_hours é armazenado para uso futuro, mas ainda não aplicado no
 * cálculo). Documentado como próximo refinamento.
 *
 * Ver docs/PLANO_MENSAGERIA.md seção 14.3.
 */
import pool from '@/lib/database/connection'
import { notifyWhatsApp, notifySlack } from '@/lib/marketing/services/agentNotificador'

const SCHEMA = 'mensageria'

interface SlaPolicy {
  id: string
  first_response_target_min: number | null
  resolution_target_min: number | null
}

/**
 * Resolve a política mais específica aplicável. Duas dimensões independentes:
 *  1. tipo de escopo: (inbox_id) > (team_id) > global (scope vazio) — regra de sempre.
 *  2. dono: dentro de cada tipo de escopo, uma política dedicada ao CLIENTE da conversa sempre
 *     vence a equivalente tenant-wide (client_id NULL) — mesma herança já usada em
 *     bot_flows/knowledge_documents. Uma conversa sem client_id (própria do tenant) nunca casa
 *     com política de cliente nenhuma.
 * Não combina múltiplos critérios dentro do mesmo nível — o primeiro match na ordem abaixo vale.
 */
async function resolveSlaPolicy(
  tenantId: string,
  ctx: { inboxId?: string | null; teamId?: string | null; clientId?: string | null },
): Promise<SlaPolicy | null> {
  const { rows } = await pool.query(
    `SELECT id, scope, first_response_target_min, resolution_target_min, client_id
       FROM ${SCHEMA}.sla_policies
      WHERE tenant_id = $1 AND is_active = true`,
    [tenantId],
  )
  if (rows.length === 0) return null

  const ownClient = (r: (typeof rows)[number]) => !!ctx.clientId && r.client_id === ctx.clientId
  const tenantWide = (r: (typeof rows)[number]) => r.client_id === null

  const byType = (match: (r: (typeof rows)[number]) => boolean) => {
    const clientMatch = rows.find((r) => match(r) && ownClient(r))
    if (clientMatch) return clientMatch
    return rows.find((r) => match(r) && tenantWide(r)) ?? null
  }

  return (
    (ctx.inboxId && byType((r) => r.scope?.inbox_id === ctx.inboxId)) ||
    (ctx.teamId && byType((r) => r.scope?.team_id === ctx.teamId)) ||
    byType((r) => !r.scope || Object.keys(r.scope).length === 0) ||
    null
  )
}

/**
 * Aplica a política resolvida a uma conversa nova, gravando os prazos.
 * Chamado a partir de ingestMessage() quando isNewConversation=true.
 */
export async function attachSlaPolicy(conversationId: string, tenantId: string, inboxId: string): Promise<void> {
  const { rows: convRows } = await pool.query(
    `SELECT team_id, client_id FROM ${SCHEMA}.conversations WHERE id = $1`,
    [conversationId],
  )
  const teamId = convRows[0]?.team_id ?? null
  const clientId = convRows[0]?.client_id ?? null

  const policy = await resolveSlaPolicy(tenantId, { inboxId, teamId, clientId })
  if (!policy) return

  const firstResponseDue = policy.first_response_target_min
    ? `now() + interval '${policy.first_response_target_min} minutes'`
    : 'NULL'
  const resolutionDue = policy.resolution_target_min
    ? `now() + interval '${policy.resolution_target_min} minutes'`
    : 'NULL'

  await pool.query(
    `INSERT INTO ${SCHEMA}.conversation_sla (conversation_id, policy_id, first_response_due, resolution_due)
     VALUES ($1, $2, ${firstResponseDue}, ${resolutionDue})
     ON CONFLICT (conversation_id) DO NOTHING`,
    [conversationId, policy.id],
  )
}

/** Marca first_response_breached comparando o momento da 1ª resposta com o prazo. Chamado do ingest.ts. */
export async function checkFirstResponseBreach(conversationId: string): Promise<void> {
  await pool.query(
    `UPDATE ${SCHEMA}.conversation_sla
        SET first_response_breached = (first_response_due IS NOT NULL AND now() > first_response_due)
      WHERE conversation_id = $1 AND first_response_due IS NOT NULL`,
    [conversationId],
  )
}

/** Marca resolution_breached no momento em que a conversa é resolvida. Chamado do PATCH de status. */
export async function checkResolutionBreach(conversationId: string): Promise<void> {
  await pool.query(
    `UPDATE ${SCHEMA}.conversation_sla
        SET resolution_breached = (resolution_due IS NOT NULL AND now() > resolution_due)
      WHERE conversation_id = $1 AND resolution_due IS NOT NULL`,
    [conversationId],
  )
}

/**
 * Varre conversas ABERTAS cujo prazo de 1ª resposta já estourou e ainda não
 * foi sinalizado, marca o estouro e dispara alerta (WhatsApp/Slack do tenant).
 * Pensado para ser chamado por um cron (padrão x-cron-secret já usado no projeto).
 */
export async function scanAndAlertBreaches(): Promise<{ scanned: number; alerted: number }> {
  const { rows } = await pool.query(
    `SELECT cs.conversation_id, c.tenant_id, ct.name AS contact_name, ct.phone AS contact_phone
       FROM ${SCHEMA}.conversation_sla cs
       JOIN ${SCHEMA}.conversations c ON c.id = cs.conversation_id
       JOIN ${SCHEMA}.contacts ct ON ct.id = c.contact_id
      WHERE cs.first_response_due IS NOT NULL
        AND cs.first_response_due < now()
        AND cs.first_response_breached = false
        AND c.first_response_at IS NULL
        AND c.status IN ('open', 'pending')`,
  )

  let alerted = 0
  for (const r of rows) {
    await pool.query(
      `UPDATE ${SCHEMA}.conversation_sla SET first_response_breached = true WHERE conversation_id = $1`,
      [r.conversation_id],
    )
    await pool.query(
      `INSERT INTO ${SCHEMA}.conversation_events (conversation_id, event_type, actor_id, payload)
       VALUES ($1, 'status_changed', NULL, $2::jsonb)`,
      [r.conversation_id, JSON.stringify({ sla: 'first_response_breached' })],
    )
    const msg = `⏰ SLA estourado: conversa com ${r.contact_name || r.contact_phone || 'contato'} sem 1ª resposta dentro do prazo.`
    await notifyWhatsApp(msg, r.tenant_id).catch(() => {})
    await notifySlack(msg, r.tenant_id).catch(() => {})
    alerted++
  }

  return { scanned: rows.length, alerted }
}

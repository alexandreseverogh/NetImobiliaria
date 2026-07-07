/**
 * Auto-atribuição de conversas novas ao time responsável pela inbox (M3).
 * Estratégia: least-loaded (menor número de conversas abertas/pendentes já
 * atribuídas) em vez de round-robin com cursor — auto-balanceia sem precisar
 * de estado persistente de "próximo da fila".
 *
 * Ver docs/PLANO_MENSAGERIA.md seção 3 (Times, colaboração e produtividade).
 */
import pool from '@/lib/database/connection'

const SCHEMA = 'mensageria'

export async function autoAssignConversation(conversationId: string, inboxId: string): Promise<void> {
  const { rows: inboxRows } = await pool.query(
    `SELECT team_id FROM ${SCHEMA}.inboxes WHERE id = $1`,
    [inboxId],
  )
  const teamId = inboxRows[0]?.team_id
  if (!teamId) return

  const { rows: teamRows } = await pool.query(
    `SELECT auto_assign FROM ${SCHEMA}.teams WHERE id = $1`,
    [teamId],
  )
  if (!teamRows[0]?.auto_assign) return

  const { rows: members } = await pool.query(
    `SELECT tm.user_id,
            (SELECT COUNT(*) FROM ${SCHEMA}.conversations c
              WHERE c.assignee_id = tm.user_id AND c.status IN ('open','pending')) AS load
       FROM ${SCHEMA}.team_members tm
      WHERE tm.team_id = $1
      ORDER BY load ASC, tm.user_id ASC
      LIMIT 1`,
    [teamId],
  )
  const chosen = members[0]?.user_id
  if (!chosen) return

  await pool.query(
    `UPDATE ${SCHEMA}.conversations SET assignee_id = $1, team_id = $2 WHERE id = $3`,
    [chosen, teamId, conversationId],
  )
  await pool.query(
    `INSERT INTO ${SCHEMA}.conversation_events (conversation_id, event_type, actor_id, payload)
     VALUES ($1, 'assigned', NULL, $2::jsonb)`,
    [conversationId, JSON.stringify({ auto: true, reason: 'least_loaded', assigneeId: chosen })],
  )
}

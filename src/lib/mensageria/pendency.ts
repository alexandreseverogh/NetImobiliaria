import pool from '@/lib/database/connection'

/**
 * "De quem é a bola" na Mensageria — mesma regra de src/lib/crm/pendencia/pendencyState.ts
 * (leads_staging.bola_com/bola_desde), aplicada à conversa.
 *
 * - 'nos'     → a última mensagem PÚBLICA é do contato e ainda não foi respondida por nós.
 * - 'cliente' → nossa última resposta pública é mais recente; a bola está com o contato.
 * - NULL      → conversa resolvida, ou ainda sem nenhuma mensagem de contato.
 *
 * Resolvida é decisão humana (status='resolved'): nunca é calculada por tempo nem por troca de
 * mensagens. Nota interna (is_private) nunca devolve a bola — não é resposta ao cliente.
 *
 * bola_desde é o início do episódio atual: só muda quando a bola troca de lado. Recalcular sem
 * mudança de lado preserva o relógio.
 */
export async function recomputeConversationBola(conversationId: string): Promise<void> {
  await pool.query(
    `WITH s AS (
       SELECT c.id, c.status,
              (SELECT max(m.created_at) FROM mensageria.messages m
                WHERE m.conversation_id = c.id AND m.direction = 'inbound') AS last_in,
              (SELECT max(m.created_at) FROM mensageria.messages m
                WHERE m.conversation_id = c.id AND m.direction = 'outbound' AND m.is_private = false) AS last_out
         FROM mensageria.conversations c
        WHERE c.id = $1::uuid
     )
     UPDATE mensageria.conversations c
        SET bola_com = CASE
                         WHEN s.status = 'resolved' OR s.last_in IS NULL THEN NULL
                         WHEN s.last_out IS NULL OR s.last_out < s.last_in THEN 'nos'
                         ELSE 'cliente' END,
            bola_desde = CASE
                         WHEN s.status = 'resolved' OR s.last_in IS NULL THEN NULL
                         WHEN s.last_out IS NULL OR s.last_out < s.last_in THEN s.last_in
                         ELSE s.last_out END
       FROM s
      WHERE c.id = s.id`,
    [conversationId],
  )
}

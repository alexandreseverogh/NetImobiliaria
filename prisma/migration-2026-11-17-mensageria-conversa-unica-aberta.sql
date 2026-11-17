-- Garante uma única conversa ABERTA (open/pending) por contato + inbox.
-- Motivo: mensagens chegando em paralelo passavam pela checagem de "existe conversa aberta"
-- antes de qualquer INSERT, e cada uma criava a sua. Resultado: várias conversas abertas
-- para o mesmo contato. O índice único parcial torna a criação idempotente no banco.
--
-- Idempotente: pode ser executada mais de uma vez com o mesmo efeito.

BEGIN;

-- 1) Mapa de duplicadas: para cada (contato, inbox) com mais de uma conversa aberta,
--    a mais recente é mantida (keep_id) e as demais viram duplicadas (dup_id).
CREATE TEMP TABLE conv_dup_map ON COMMIT DROP AS
SELECT id AS dup_id, keep_id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER w AS rn,
           FIRST_VALUE(id) OVER w AS keep_id
      FROM mensageria.conversations
     WHERE status IN ('open', 'pending')
    WINDOW w AS (PARTITION BY contact_id, inbox_id ORDER BY last_message_at DESC NULLS LAST, created_at DESC)
  ) r
 WHERE rn > 1;

-- 2) Move mensagens, eventos e etiquetas para a conversa mantida
UPDATE mensageria.messages m
   SET conversation_id = d.keep_id
  FROM conv_dup_map d
 WHERE m.conversation_id = d.dup_id;

UPDATE mensageria.conversation_events e
   SET conversation_id = d.keep_id
  FROM conv_dup_map d
 WHERE e.conversation_id = d.dup_id;

INSERT INTO mensageria.conversation_labels (conversation_id, label_id)
SELECT DISTINCT d.keep_id, cl.label_id
  FROM conv_dup_map d
  JOIN mensageria.conversation_labels cl ON cl.conversation_id = d.dup_id
ON CONFLICT DO NOTHING;

-- 3) Remove as conversas duplicadas (ON DELETE CASCADE cuida do que sobrou delas)
DELETE FROM mensageria.conversations c
 USING conv_dup_map d
 WHERE c.id = d.dup_id;

-- 4) Recalcula a última mensagem da conversa mantida a partir das mensagens reais
UPDATE mensageria.conversations c
   SET last_message_at = sub.max_at
  FROM (
    SELECT conversation_id, MAX(created_at) AS max_at
      FROM mensageria.messages
     GROUP BY conversation_id
  ) sub
 WHERE c.id = sub.conversation_id
   AND c.status IN ('open', 'pending')
   AND (c.last_message_at IS NULL OR c.last_message_at < sub.max_at);

-- 5) Índice único parcial: no máximo UMA conversa aberta por (tenant, inbox, contato)
CREATE UNIQUE INDEX IF NOT EXISTS ux_conversations_open_per_contact
  ON mensageria.conversations (tenant_id, inbox_id, contact_id)
  WHERE status IN ('open', 'pending');

COMMIT;

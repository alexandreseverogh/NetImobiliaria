-- Mensageria: "de quem é a bola" + auditoria de resolução (2026-11-17).
--
-- 1) Colunas bola_com/bola_desde em mensageria.conversations, mesma semântica do CRM
--    (leads_staging.bola_com/bola_desde, docs/PLANO_PENDENCIA_ATENDIMENTO.md):
--      'nos'     → a última mensagem pública é do contato e ainda não foi respondida por nós
--      'cliente' → nossa última resposta pública é mais recente; a bola está com o contato
--      NULL      → conversa resolvida (ou sem nenhuma mensagem de contato ainda)
--    Resolvida é decisão humana (status='resolved'), nunca calculada por tempo.
-- 2) Três parâmetros de auditoria de resolução por segmento (system_benchmarks, mesma cascata
--    cliente → tenant → segmento usada pelos demais parâmetros do Master):
--      audit_fast_resolve_min     — resolvida em menos de N min após mensagem do cliente sem resposta
--      audit_reopen_days          — mesmo contato voltou em menos de N dias após resolução
--      audit_long_silence_hours   — resolvida N horas ou mais após mensagem do cliente sem resposta
--    Valores iniciais iguais para todos os segmentos (defaults para testes; o Master ajusta).
--
-- Idempotente: pode ser executada mais de uma vez com o mesmo efeito.

BEGIN;

ALTER TABLE mensageria.conversations ADD COLUMN IF NOT EXISTS bola_com VARCHAR(10);
ALTER TABLE mensageria.conversations ADD COLUMN IF NOT EXISTS bola_desde TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_conversations_bola_com'
  ) THEN
    ALTER TABLE mensageria.conversations
      ADD CONSTRAINT chk_conversations_bola_com CHECK (bola_com IN ('nos', 'cliente'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_bola_pendente
  ON mensageria.conversations (tenant_id, bola_desde)
  WHERE bola_com = 'nos' AND status IN ('open', 'pending');

-- Backfill: mesma regra do recompute em src/lib/mensageria/pendency.ts.
WITH s AS (
  SELECT c.id, c.status,
         (SELECT max(m.created_at) FROM mensageria.messages m
           WHERE m.conversation_id = c.id AND m.direction = 'inbound') AS last_in,
         (SELECT max(m.created_at) FROM mensageria.messages m
           WHERE m.conversation_id = c.id AND m.direction = 'outbound' AND m.is_private = false) AS last_out
    FROM mensageria.conversations c
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
 WHERE c.id = s.id;

-- Parâmetros de auditoria: uma linha por segmento ativo e por chave, sem sobrescrever valor já curado.
INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
SELECT ss.id, v.metric_key, v.metric_label, v.value, v.unit, v.description
  FROM public.system_segments ss
 CROSS JOIN (VALUES
   ('audit_fast_resolve_min',   'Resolução rápida suspeita (min)',      15::numeric, 'NUM',
      'Conversa resolvida em menos de N minutos após mensagem do cliente sem resposta nossa.'),
   ('audit_reopen_days',        'Reincidência suspeita (dias)',          3::numeric,  'NUM',
      'Mesmo contato voltou em menos de N dias após a conversa ser resolvida.'),
   ('audit_long_silence_hours', 'Resolução após longo silêncio (horas)', 48::numeric, 'NUM',
      'Conversa resolvida N horas ou mais após mensagem do cliente sem resposta nossa.')
 ) AS v(metric_key, metric_label, value, unit, description)
 WHERE ss.is_active = true
   AND NOT EXISTS (
     SELECT 1 FROM public.system_benchmarks sb
      WHERE sb.segment_id = ss.id AND sb.metric_key = v.metric_key AND sb.network_id IS NULL
   );

COMMIT;

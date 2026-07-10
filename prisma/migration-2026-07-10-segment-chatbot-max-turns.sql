-- Adiciona o padrão de "Transferir após N interações do bot" como parâmetro por
-- SEGMENTO (editável pelo Master em /admin/master/segments), em vez de um valor fixo
-- no componente React. Cada segmento de negócio pode ter seu próprio padrão — uma
-- conversa imobiliária naturalmente passa de mais turnos explorando bairros do que,
-- por exemplo, um FAQ simples. O tenant continua podendo sobrepor o próprio valor em
-- /mensageria/config (bot_flows.handoff_rules.maxTurns); este é só o valor sugerido
-- inicial quando o tenant ainda não configurou o próprio.
-- Mesmo padrão já usado pra outros parâmetros diretos em system_segments (cpl_ideal etc.).

BEGIN;

ALTER TABLE public.system_segments
  ADD COLUMN IF NOT EXISTS chatbot_max_turns_default INTEGER NOT NULL DEFAULT 6;

COMMIT;

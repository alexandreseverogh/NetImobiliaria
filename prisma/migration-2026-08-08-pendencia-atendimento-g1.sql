-- ============================================================================
-- G1 — Motor de Vigilância de Pendência de Atendimento
-- Data: 2026-08-08
-- Schema: public
-- Plano: docs/PLANO_PENDENCIA_ATENDIMENTO.md §4 e §6
-- APLICAR VIA psql — NUNCA `prisma db push`
--   docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria \
--     < prisma/migration-2026-08-08-pendencia-atendimento-g1.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) payload da ação — hoje guarda o DEGRAU da escada de escalonamento.
--
--    É o que viabiliza a mudança arquitetural central do §2.1 do plano: a idempotência
--    deixa de ser "uma vez por lead PARA SEMPRE" (como no F1, que ficava cego depois do
--    1º disparo) e passa a ser "uma vez por DEGRAU, por EPISÓDIO de pendência".
--
--    A chave do episódio é o próprio leads_staging.bola_desde — nenhuma tabela nova:
--      degrau N já disparou neste episódio  ⟺  EXISTS crm_agent_actions
--          WHERE lead_uuid = X AND agent_key = 'pendencia_atendimento'
--            AND (payload->>'degrau')::int >= N
--            AND created_at >= bola_desde
--    Quando a bola é devolvida e volta depois, bola_desde avança e todos os degraus
--    rearmam sozinhos — é isso que torna o comportamento sistemático do 2º toque em diante.
--
--    jsonb genérico (e não uma coluna `degrau` dedicada) porque qualquer agente futuro pode
--    precisar carregar contexto próprio na ação sem exigir migração nova.
-- ----------------------------------------------------------------------------
ALTER TABLE public.crm_agent_actions
  ADD COLUMN IF NOT EXISTS payload jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.crm_agent_actions.payload IS
  'Contexto livre da ação. Em pendencia_atendimento carrega {"degrau": 1|2|3|4} — a chave '
  'da idempotência por episódio. Ver docs/PLANO_PENDENCIA_ATENDIMENTO.md §2.1.';

-- Índice que serve a checagem de idempotência, executada por lead candidato a cada varredura
-- (de 5 em 5 min). Sem ele, a subquery NOT EXISTS faria seq scan da tabela de ações inteira.
CREATE INDEX IF NOT EXISTS idx_crm_agent_actions_lead_agente_data
  ON public.crm_agent_actions (lead_uuid, agent_key, created_at DESC);

-- ----------------------------------------------------------------------------
-- 2) Absorção do F1 (speed_to_lead) pelo motor novo.
--
--    O F1 era o caso particular de ordinal 1 do mesmo relógio: "a bola está conosco desde a
--    captação e ninguém devolveu". O motor novo cobre isso E todos os toques seguintes, com
--    limiar próprio para o 1º contato (que é legitimamente mais agressivo — minutos, não horas).
--    Manter os dois geraria alerta duplicado e configuração confusa.
--
--    Seguro fazer agora: verificado em 2026-08-08 que existe exatamente 1 linha de config de
--    speed_to_lead em toda a base (escopo segmento, ativo=false, params={}) e ZERO ações
--    geradas. Nenhum tenant perde configuração real. Essa janela fecha no instante em que
--    algum cliente ativar o agente de verdade.
-- ----------------------------------------------------------------------------
DELETE FROM public.crm_agentes_config_segmento WHERE agent_key = 'speed_to_lead';
DELETE FROM public.crm_agentes_config_tenant   WHERE agent_key = 'speed_to_lead';

-- ============================================================================
-- FIM.
-- ============================================================================

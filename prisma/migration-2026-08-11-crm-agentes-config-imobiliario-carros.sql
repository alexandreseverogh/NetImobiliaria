-- Seed de crm_agentes_config_segmento pros segmentos "Imobiliário" e "Venda de Carros",
-- ativando os 5 agentes de aceleração do CRM com os mesmos valores default já cravados no
-- código (paramHints de cada agente — src/lib/crm/agents/*.ts) — só torna explícito o que já
-- seria o comportamento de fallback, pra facilitar teste manual sem precisar abrir o modal
-- do Master e preencher campo a campo. Ambos segmentos estavam com 0 linhas nesta tabela
-- (nenhum agente configurado, portanto nenhum ativo).
--
-- stage_stagnation não tem paramHints — o limiar dele é por COLUNA do Kanban
-- (kanban_colunas.sla_hours, configurado em "Personalização Kanban"), não um parâmetro
-- genérico do agente. params fica '{}' de propósito, só o toggle "ativo" importa aqui.
--
-- ⚠️ reactivation é o único agente que fala com o lead sem passar por ninguém quando
-- requer_revisao_extra=false (o default do código, replicado aqui). Adequado pra ambiente de
-- teste; ao usar esses segmentos com tenants/leads reais em produção, decidir
-- conscientemente se algum precisa de requer_revisao_extra=true antes de deixar ativo.

INSERT INTO public.crm_agentes_config_segmento (segment_id, agent_key, ativo, params)
VALUES
  -- ── Imobiliário ──────────────────────────────────────────────────────────────
  ('92e5ddd3-4f3b-4f93-9839-6168d09e25e8'::uuid, 'pendencia_atendimento', true,
   '{"minutos_1o_contato": "30", "minutos_continuidade": "240", "fator_escalonamento": "3", "fator_reatribuicao": "6"}'::jsonb),
  ('92e5ddd3-4f3b-4f93-9839-6168d09e25e8'::uuid, 'stage_stagnation', true, '{}'::jsonb),
  ('92e5ddd3-4f3b-4f93-9839-6168d09e25e8'::uuid, 'next_best_action', true,
   '{"qtd_atividades_contexto": "5"}'::jsonb),
  ('92e5ddd3-4f3b-4f93-9839-6168d09e25e8'::uuid, 'reactivation', true,
   '{"dias_inatividade": "7", "requer_revisao_extra": "false"}'::jsonb),
  ('92e5ddd3-4f3b-4f93-9839-6168d09e25e8'::uuid, 'score_recalibration', true,
   '{"janela_dias": "90", "divergencia_minima_pct": "30", "min_leads_amostra": "10"}'::jsonb),

  -- ── Venda de Carros ──────────────────────────────────────────────────────────
  ('e842312b-da48-403f-afdf-5058e2435a8c'::uuid, 'pendencia_atendimento', true,
   '{"minutos_1o_contato": "30", "minutos_continuidade": "240", "fator_escalonamento": "3", "fator_reatribuicao": "6"}'::jsonb),
  ('e842312b-da48-403f-afdf-5058e2435a8c'::uuid, 'stage_stagnation', true, '{}'::jsonb),
  ('e842312b-da48-403f-afdf-5058e2435a8c'::uuid, 'next_best_action', true,
   '{"qtd_atividades_contexto": "5"}'::jsonb),
  ('e842312b-da48-403f-afdf-5058e2435a8c'::uuid, 'reactivation', true,
   '{"dias_inatividade": "7", "requer_revisao_extra": "false"}'::jsonb),
  ('e842312b-da48-403f-afdf-5058e2435a8c'::uuid, 'score_recalibration', true,
   '{"janela_dias": "90", "divergencia_minima_pct": "30", "min_leads_amostra": "10"}'::jsonb)

ON CONFLICT (segment_id, agent_key) DO UPDATE SET ativo = true, params = EXCLUDED.params, updated_at = now();

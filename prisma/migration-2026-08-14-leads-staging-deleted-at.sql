-- Exclusão de lead no CRM (/crm/kanban) — regra de negócio decidida pelo usuário:
-- lead SEM nenhuma atividade registrada pode ser excluído permanentemente (a tabela já tem
-- FK ON DELETE CASCADE pra tudo relacionado — atividades_lead, consentimentos_lead,
-- crm_agent_actions, leads_kanban_ciclos, leads_kanban, leads_staging_atribuicoes,
-- marketing_eventos); lead COM atividades registradas é excluído de forma reversível
-- (soft-delete) e pode ser restaurado.

ALTER TABLE public.leads_staging
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_staging_deleted_at
  ON public.leads_staging (tenant_id, deleted_at);

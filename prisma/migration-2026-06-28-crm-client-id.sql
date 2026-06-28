-- ============================================================================
-- MIGRATION: client_id (cliente/segmento) no pipeline de leads do CRM
-- Data: 2026-06-28
-- Schema: public
-- APLICAR VIA psql — NUNCA `prisma db push`
--   psql -h localhost -p 15432 -U postgres -d net_imobiliaria -f prisma/migration-2026-06-28-crm-client-id.sql
--
-- Contexto: todas estas tabelas já possuem tenant_id. Esta migration adiciona
-- client_id (nullable) para isolamento por cliente/segmento — mesmo conceito do
-- módulo de marketing (client_id NULL = "own" / sem segmento específico).
-- 100% aditiva: ADD COLUMN IF NOT EXISTS, nenhuma linha existente é invalidada.
-- ============================================================================

ALTER TABLE public.leads_staging              ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.leads_kanban               ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.leads_kanban_ciclos        ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.marketing_eventos          ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.leads_staging_atribuicoes  ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.imovel_prospects           ADD COLUMN IF NOT EXISTS client_id uuid;
ALTER TABLE public.kanban_colunas             ADD COLUMN IF NOT EXISTS client_id uuid;

-- Índices compostos (tenant_id, client_id) para consultas isoladas por segmento
CREATE INDEX IF NOT EXISTS idx_leads_staging_tenant_client
  ON public.leads_staging (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_leads_kanban_tenant_client
  ON public.leads_kanban (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_marketing_eventos_tenant_client
  ON public.marketing_eventos (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_imovel_prospects_tenant_client
  ON public.imovel_prospects (tenant_id, client_id);

-- ============================================================================
-- FIM. Nenhuma tabela é derrubada; colunas nullable (legado/own permanece NULL).
-- ============================================================================

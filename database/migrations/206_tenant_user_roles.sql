-- ============================================================
-- MIGRATION 206: Isolamento Multi-Tenant — user_roles
-- Net Imobiliária — Fase 7 do Plano Multi-Tenant
-- ============================================================
-- REGRA:
--   tenant_id = NULL  → Perfil global de plataforma (criado pelo Master)
--                        Visível para todos os tenants
--   tenant_id = UUID  → Perfil exclusivo do tenant
--                        Visível apenas para aquele tenant

BEGIN;

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Perfis existentes são globais (criados antes do multi-tenant)
-- Mantemos tenant_id = NULL intencionalmente
-- Isso os classifica como "perfis de plataforma"

CREATE INDEX IF NOT EXISTS idx_user_roles_tenant_id
  ON public.user_roles(tenant_id);

COMMIT;

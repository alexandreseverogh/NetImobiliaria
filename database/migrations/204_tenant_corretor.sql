-- ============================================================
-- MIGRATION 204: Isolamento Multi-Tenant — Corretor
-- Net Imobiliária — Fase 5 do Plano Multi-Tenant
-- Tabelas: corretor_areas_atuacao, corretor_scores
-- ============================================================

BEGIN;

-- ============================================================
-- 1. corretor_areas_atuacao
-- ============================================================
ALTER TABLE public.corretor_areas_atuacao
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Backfill via tenant ativo do corretor
UPDATE public.corretor_areas_atuacao caa
  SET tenant_id = (
    SELECT utm.tenant_id
    FROM public.user_tenant_membership utm
    WHERE utm.user_id = caa.corretor_fk
      AND utm.is_active = true
    LIMIT 1
  )
  WHERE tenant_id IS NULL;

-- Fallback para corretores sem membership ativa
UPDATE public.corretor_areas_atuacao
  SET tenant_id = '00000000-0000-0000-0000-000000000001'
  WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_corretor_areas_tenant_id ON public.corretor_areas_atuacao(tenant_id);

-- ============================================================
-- 2. corretor_scores
-- ============================================================
ALTER TABLE public.corretor_scores
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.corretor_scores cs
  SET tenant_id = (
    SELECT utm.tenant_id
    FROM public.user_tenant_membership utm
    WHERE utm.user_id = cs.user_id
      AND utm.is_active = true
    LIMIT 1
  )
  WHERE tenant_id IS NULL;

UPDATE public.corretor_scores
  SET tenant_id = '00000000-0000-0000-0000-000000000001'
  WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_corretor_scores_tenant_id ON public.corretor_scores(tenant_id);

COMMIT;

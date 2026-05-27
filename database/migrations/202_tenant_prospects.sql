-- ============================================================
-- MIGRATION 202: Isolamento Multi-Tenant — Prospects
-- Net Imobiliária — Fase 3 do Plano Multi-Tenant
-- Tabelas: imovel_prospects, imovel_prospect_atribuicoes
-- DEPENDE: Migration 200 (imoveis já deve ter tenant_id)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. imovel_prospects
-- ============================================================
ALTER TABLE public.imovel_prospects
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Backfill via imóvel de interesse
UPDATE public.imovel_prospects ip
  SET tenant_id = i.tenant_id
  FROM public.imoveis i
  WHERE ip.id_imovel = i.id;

-- Fallback para registros órfãos (sem imóvel)
UPDATE public.imovel_prospects
  SET tenant_id = '00000000-0000-0000-0000-000000000001'
  WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_imovel_prospects_tenant_id ON public.imovel_prospects(tenant_id);

-- ============================================================
-- 2. imovel_prospect_atribuicoes
-- ============================================================
ALTER TABLE public.imovel_prospect_atribuicoes
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.imovel_prospect_atribuicoes ipa
  SET tenant_id = ip.tenant_id
  FROM public.imovel_prospects ip
  WHERE ipa.prospect_id = ip.id;

UPDATE public.imovel_prospect_atribuicoes
  SET tenant_id = '00000000-0000-0000-0000-000000000001'
  WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_imovel_prosp_atrib_tenant_id ON public.imovel_prospect_atribuicoes(tenant_id);

COMMIT;

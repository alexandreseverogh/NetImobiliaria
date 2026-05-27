-- ============================================================
-- MIGRATION 201: Isolamento Multi-Tenant — Pivôs de Imóveis
-- Net Imobiliária — Fase 2 do Plano Multi-Tenant
-- Tabelas: imovel_amenidades, imovel_proximidades
-- DEPENDE: Migration 200 (imoveis já deve ter tenant_id)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. imovel_amenidades
-- ============================================================
ALTER TABLE public.imovel_amenidades
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.imovel_amenidades ia
  SET tenant_id = i.tenant_id
  FROM public.imoveis i
  WHERE ia.imovel_id = i.id;

CREATE INDEX IF NOT EXISTS idx_imovel_amenidades_tenant_id ON public.imovel_amenidades(tenant_id);

-- ============================================================
-- 2. imovel_proximidades
-- ============================================================
ALTER TABLE public.imovel_proximidades
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.imovel_proximidades ip
  SET tenant_id = i.tenant_id
  FROM public.imoveis i
  WHERE ip.imovel_id = i.id;

CREATE INDEX IF NOT EXISTS idx_imovel_proximidades_tenant_id ON public.imovel_proximidades(tenant_id);

COMMIT;

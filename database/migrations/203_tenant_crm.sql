-- ============================================================
-- MIGRATION 203: Isolamento Multi-Tenant — CRM Leads e Kanban
-- Net Imobiliária — Fase 4 do Plano Multi-Tenant
-- Tabelas: leads_staging, leads_kanban, kanban_colunas,
--          marketing_eventos, consentimentos_lead
-- ============================================================

BEGIN;

-- ============================================================
-- 1. leads_staging (tabela central do CRM)
-- ============================================================
ALTER TABLE public.leads_staging
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.leads_staging
  SET tenant_id = '00000000-0000-0000-0000-000000000001'
  WHERE tenant_id IS NULL;

ALTER TABLE public.leads_staging
  ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_staging_tenant_id ON public.leads_staging(tenant_id);

-- ============================================================
-- 2. leads_kanban — herda via lead
-- ============================================================
ALTER TABLE public.leads_kanban
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.leads_kanban lk
  SET tenant_id = ls.tenant_id
  FROM public.leads_staging ls
  WHERE lk.lead_uuid = ls.lead_uuid;

UPDATE public.leads_kanban
  SET tenant_id = '00000000-0000-0000-0000-000000000001'
  WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_kanban_tenant_id ON public.leads_kanban(tenant_id);

-- ============================================================
-- 3. kanban_colunas — por tenant (decisão confirmada)
-- ============================================================
ALTER TABLE public.kanban_colunas
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Colunas existentes vão para o tenant padrão
UPDATE public.kanban_colunas
  SET tenant_id = '00000000-0000-0000-0000-000000000001'
  WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_kanban_colunas_tenant_id ON public.kanban_colunas(tenant_id);

-- ============================================================
-- 4. marketing_eventos — herda via lead
-- ============================================================
ALTER TABLE public.marketing_eventos
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.marketing_eventos me
  SET tenant_id = ls.tenant_id
  FROM public.leads_staging ls
  WHERE me.lead_uuid = ls.lead_uuid;

UPDATE public.marketing_eventos
  SET tenant_id = '00000000-0000-0000-0000-000000000001'
  WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_marketing_eventos_tenant_id ON public.marketing_eventos(tenant_id);

-- ============================================================
-- 5. consentimentos_lead — herda via lead
-- ============================================================
ALTER TABLE public.consentimentos_lead
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.consentimentos_lead cl
  SET tenant_id = ls.tenant_id
  FROM public.leads_staging ls
  WHERE cl.lead_uuid = ls.lead_uuid;

UPDATE public.consentimentos_lead
  SET tenant_id = '00000000-0000-0000-0000-000000000001'
  WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_consentimentos_tenant_id ON public.consentimentos_lead(tenant_id);

COMMIT;

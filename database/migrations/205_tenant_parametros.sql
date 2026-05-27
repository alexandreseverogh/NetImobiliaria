-- ============================================================
-- MIGRATION 205: Isolamento Multi-Tenant — Parâmetros
-- Net Imobiliária — Fase 6 do Plano Multi-Tenant
-- Tabelas: parametros, valor_destaque_local
-- ============================================================
-- NOTA: parametros era singleton (1 linha sem PK).
-- Após esta migration, passa a suportar 1 linha por tenant.

BEGIN;

-- ============================================================
-- 1. parametros — refatorar para multi-tenant
-- ============================================================

-- Adicionar id serial (caso não exista PK)
ALTER TABLE public.parametros
  ADD COLUMN IF NOT EXISTS id SERIAL;

-- Adicionar tenant_id
ALTER TABLE public.parametros
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Backfill: linha existente é do tenant padrão
UPDATE public.parametros
  SET tenant_id = '00000000-0000-0000-0000-000000000001'
  WHERE tenant_id IS NULL;

-- Garantir 1 linha por tenant
CREATE UNIQUE INDEX IF NOT EXISTS idx_parametros_tenant_unique
  ON public.parametros(tenant_id);

CREATE INDEX IF NOT EXISTS idx_parametros_tenant_id
  ON public.parametros(tenant_id);

-- ============================================================
-- 2. valor_destaque_local — por tenant
-- ============================================================
ALTER TABLE public.valor_destaque_local
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.valor_destaque_local
  SET tenant_id = '00000000-0000-0000-0000-000000000001'
  WHERE tenant_id IS NULL;

-- Remover constraint antiga (estado+cidade único globalmente)
ALTER TABLE public.valor_destaque_local
  DROP CONSTRAINT IF EXISTS valor_destaque_local_estado_fk_cidade_fk_key;

-- Nova constraint: único por tenant + estado + cidade
ALTER TABLE public.valor_destaque_local
  ADD CONSTRAINT valor_destaque_local_tenant_estado_cidade_key
  UNIQUE (tenant_id, estado_fk, cidade_fk);

CREATE INDEX IF NOT EXISTS idx_valor_destaque_local_tenant
  ON public.valor_destaque_local(tenant_id);

COMMIT;

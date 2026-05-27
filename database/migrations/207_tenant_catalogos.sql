-- ============================================================
-- MIGRATION 207: Isolamento Multi-Tenant — Catálogos do Segmento
-- Net Imobiliária — Fase 9 do Plano Multi-Tenant
-- Tabelas: tipos_imovel, finalidades_imovel, status_imovel,
--          tipo_documento_imovel, financiadores,
--          categorias_amenidades, amenidades,
--          categorias_proximidades, proximidades
-- ============================================================

BEGIN;

-- ============================================================
-- 1. tipos_imovel
-- ============================================================
ALTER TABLE public.tipos_imovel
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.tipos_imovel SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_tipos_imovel_tenant_id ON public.tipos_imovel(tenant_id);

-- ============================================================
-- 2. finalidades_imovel
-- ============================================================
ALTER TABLE public.finalidades_imovel
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.finalidades_imovel SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_finalidades_imovel_tenant_id ON public.finalidades_imovel(tenant_id);

-- ============================================================
-- 3. status_imovel
-- ============================================================
ALTER TABLE public.status_imovel
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.status_imovel SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_status_imovel_tenant_id ON public.status_imovel(tenant_id);

-- ============================================================
-- 4. tipo_documento_imovel
-- ============================================================
ALTER TABLE public.tipo_documento_imovel
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.tipo_documento_imovel SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_tipo_doc_imovel_tenant_id ON public.tipo_documento_imovel(tenant_id);

-- ============================================================
-- 5. financiadores
-- ============================================================
ALTER TABLE public.financiadores
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.financiadores SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_financiadores_tenant_id ON public.financiadores(tenant_id);

-- ============================================================
-- 6. categorias_amenidades
-- ============================================================
ALTER TABLE public.categorias_amenidades
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.categorias_amenidades SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_cat_amenidades_tenant_id ON public.categorias_amenidades(tenant_id);

-- ============================================================
-- 7. amenidades
-- ============================================================
ALTER TABLE public.amenidades
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.amenidades SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_amenidades_tenant_id ON public.amenidades(tenant_id);

-- ============================================================
-- 8. categorias_proximidades
-- ============================================================
ALTER TABLE public.categorias_proximidades
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.categorias_proximidades SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_cat_proximidades_tenant_id ON public.categorias_proximidades(tenant_id);

-- ============================================================
-- 9. proximidades
-- ============================================================
ALTER TABLE public.proximidades
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;
UPDATE public.proximidades SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_proximidades_tenant_id ON public.proximidades(tenant_id);

COMMIT;

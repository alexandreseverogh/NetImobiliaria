-- ============================================================
-- MIGRATION 200: Isolamento Multi-Tenant — Núcleo de Imóveis
-- Net Imobiliária — Fase 1 do Plano Multi-Tenant
-- Tabelas: imoveis, imovel_imagens, imovel_documentos,
--          imovel_video, imovel_visitas, imovel_status, imovel_rascunho
-- ============================================================
-- SEGURO: Usa ADD COLUMN IF NOT EXISTS + backfill antes de NOT NULL

BEGIN;

-- ============================================================
-- 1. imoveis (tabela principal — CRÍTICO)
-- ============================================================
ALTER TABLE public.imoveis
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

-- Backfill: todos os imóveis existentes vão para o tenant padrão (legado)
UPDATE public.imoveis
  SET tenant_id = '00000000-0000-0000-0000-000000000001'
  WHERE tenant_id IS NULL;

-- Tornar NOT NULL após backfill
ALTER TABLE public.imoveis
  ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_imoveis_tenant_id ON public.imoveis(tenant_id);

-- ============================================================
-- 2. imovel_imagens
-- ============================================================
ALTER TABLE public.imovel_imagens
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.imovel_imagens img
  SET tenant_id = i.tenant_id
  FROM public.imoveis i
  WHERE img.imovel_id = i.id;

CREATE INDEX IF NOT EXISTS idx_imovel_imagens_tenant_id ON public.imovel_imagens(tenant_id);

-- ============================================================
-- 3. imovel_documentos
-- ============================================================
ALTER TABLE public.imovel_documentos
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.imovel_documentos d
  SET tenant_id = i.tenant_id
  FROM public.imoveis i
  WHERE d.id_imovel = i.id;

CREATE INDEX IF NOT EXISTS idx_imovel_documentos_tenant_id ON public.imovel_documentos(tenant_id);

-- ============================================================
-- 4. imovel_video
-- ============================================================
ALTER TABLE public.imovel_video
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.imovel_video v
  SET tenant_id = i.tenant_id
  FROM public.imoveis i
  WHERE v.imovel_id = i.id;

CREATE INDEX IF NOT EXISTS idx_imovel_video_tenant_id ON public.imovel_video(tenant_id);

-- ============================================================
-- 5. imovel_visitas
-- ============================================================
ALTER TABLE public.imovel_visitas
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.imovel_visitas v
  SET tenant_id = i.tenant_id
  FROM public.imoveis i
  WHERE v.imovel_id = i.id;

CREATE INDEX IF NOT EXISTS idx_imovel_visitas_tenant_id ON public.imovel_visitas(tenant_id);

-- ============================================================
-- 6. imovel_status (histórico de mudanças de status)
-- ============================================================
ALTER TABLE public.imovel_status
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.imovel_status s
  SET tenant_id = i.tenant_id
  FROM public.imoveis i
  WHERE s.imovel_fk = i.id;

CREATE INDEX IF NOT EXISTS idx_imovel_status_hist_tenant_id ON public.imovel_status(tenant_id);

-- ============================================================
-- 7. imovel_rascunho
-- ============================================================
ALTER TABLE public.imovel_rascunho
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE;

UPDATE public.imovel_rascunho r
  SET tenant_id = i.tenant_id
  FROM public.imoveis i
  WHERE r.imovel_id = i.id;

CREATE INDEX IF NOT EXISTS idx_imovel_rascunho_tenant_id ON public.imovel_rascunho(tenant_id);

COMMIT;

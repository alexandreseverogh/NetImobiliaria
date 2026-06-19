-- ============================================================
-- Migração: Adicionar Colunas de Meta e Agentes na Tabela Tenants
-- Arquivo: prisma/migration-2026-06-18-tenants-meta-and-agents.sql
-- ============================================================

BEGIN;

-- 1. Adicionar novas colunas na tabela public.tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS meta_page_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS meta_pixel_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS meta_instagram_actor_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS anthropic_api_key TEXT,
  ADD COLUMN IF NOT EXISTS slack_webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS evolution_api_url TEXT,
  ADD COLUMN IF NOT EXISTS evolution_api_key TEXT,
  ADD COLUMN IF NOT EXISTS evolution_instance VARCHAR(100),
  ADD COLUMN IF NOT EXISTS agent_confidence_threshold NUMERIC DEFAULT 0.85;

-- 2. Backfill: Copiar page_id, pixel_id e instagram_actor_id de tenant_network_credentials para tenants
UPDATE public.tenants t
SET
  meta_page_id = COALESCE(t.meta_page_id, (
    SELECT credentials->>'page_id'
    FROM public.tenant_network_credentials tnc
    JOIN public.ad_networks n ON n.id = tnc.network_id
    WHERE tnc.tenant_id = t.id AND n.code = 'meta'
    LIMIT 1
  )),
  meta_pixel_id = COALESCE(t.meta_pixel_id, (
    SELECT credentials->>'pixel_id'
    FROM public.tenant_network_credentials tnc
    JOIN public.ad_networks n ON n.id = tnc.network_id
    WHERE tnc.tenant_id = t.id AND n.code = 'meta'
    LIMIT 1
  )),
  meta_instagram_actor_id = COALESCE(t.meta_instagram_actor_id, (
    SELECT credentials->>'instagram_actor_id'
    FROM public.tenant_network_credentials tnc
    JOIN public.ad_networks n ON n.id = tnc.network_id
    WHERE tnc.tenant_id = t.id AND n.code = 'meta'
    LIMIT 1
  ));

COMMIT;

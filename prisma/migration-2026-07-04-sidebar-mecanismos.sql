-- ============================================================
-- Migration 2026-07-04: Sidebar CTA + Tenant cols para Mecanismos C e D
-- Aplicar via psql:
--   psql -h 127.0.0.1 -p 15432 -U postgres -d net_imobiliaria -f prisma/migration-2026-07-04-sidebar-mecanismos.sql
-- ============================================================

BEGIN;

-- 1. Sidebar: adicionar itens filhos de "Tráfego Pago" (parent_id=110)
--    Idempotente: só insere se a URL ainda não existe
INSERT INTO public.sidebar_menu_items (parent_id, name, icon_name, url, order_index, is_active, system_id)
SELECT 110, 'Destinos de CTA',      'LinkIcon',                    '/admin/campanhas/destinos',      5, true, 'admin'
WHERE NOT EXISTS (SELECT 1 FROM public.sidebar_menu_items WHERE url = '/admin/campanhas/destinos');

INSERT INTO public.sidebar_menu_items (parent_id, name, icon_name, url, order_index, is_active, system_id)
SELECT 110, 'Analytics de Captura', 'PresentationChartBarIcon',    '/admin/campanhas/cta-analytics', 6, true, 'admin'
WHERE NOT EXISTS (SELECT 1 FROM public.sidebar_menu_items WHERE url = '/admin/campanhas/cta-analytics');

INSERT INTO public.sidebar_menu_items (parent_id, name, icon_name, url, order_index, is_active, system_id)
SELECT 110, 'Mecanismos',           'SignalIcon',                   '/admin/campanhas/mecanismos',    7, true, 'admin'
WHERE NOT EXISTS (SELECT 1 FROM public.sidebar_menu_items WHERE url = '/admin/campanhas/mecanismos');

-- 2. Colunas na tabela tenants para Mecanismo C (webhook key) e D (Meta Lead Ads)
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS cta_webhook_key    text,
  ADD COLUMN IF NOT EXISTS meta_verify_token  text,
  ADD COLUMN IF NOT EXISTS meta_app_secret    text,
  ADD COLUMN IF NOT EXISTS meta_page_map      jsonb DEFAULT '[]'::jsonb;

-- 3. Gerar chaves de webhook para tenants existentes (UUID aleatório)
UPDATE public.tenants
SET cta_webhook_key = gen_random_uuid()::text
WHERE cta_webhook_key IS NULL;

COMMIT;

-- ============================================================
-- Migration: Registrar /admin/master/prompts na plataforma
-- Data: 2026-06-23
-- Descrição: Editor de Prompts (FASE 20) — nova feature Master
--            e item na sidebar MASTER PLATFORM.
--            O Catálogo de Modelos (FASE 22) é uma tab dentro de
--            /admin/master/ia-plataforma (já registrada, id=98),
--            portanto não precisa de novo registro.
-- ============================================================

BEGIN;

-- 1. system_features — Editor de Prompts
-- category_id = 22 → "Master Governance" (mesma categoria usada por master-segments,
-- master-ia-plataforma, master-modules, master-global-audit-full).
-- A função get_sidebar_menu_for_user exige category_id preenchido para exibir o item.
INSERT INTO public.system_features (
  name,
  slug,
  url,
  description,
  category_id,
  is_active,
  is_default_tenant_admin_feature,
  sort_order,
  icon
)
VALUES (
  'Editor de Prompts',
  'master-prompts-editor',
  '/admin/master/prompts',
  'Gerencia e testa os templates de prompt do sistema (FASE 20).',
  22,
  true,
  false,
  99,
  'DocumentTextIcon'
)
ON CONFLICT (slug) DO UPDATE SET
  url         = EXCLUDED.url,
  description = EXCLUDED.description,
  category_id = EXCLUDED.category_id,
  is_active   = EXCLUDED.is_active,
  icon        = EXCLUDED.icon,
  updated_at  = NOW();

-- 2. sidebar_menu_items — filho do MASTER PLATFORM (id = 83)
--    order_index 10 (max anterior era 9 — Auditoria Global)
INSERT INTO public.sidebar_menu_items (
  parent_id,
  name,
  url,
  icon_name,
  order_index,
  is_active,
  description,
  feature_id
)
VALUES (
  83,
  'Editor de Prompts',
  '/admin/master/prompts',
  'DocumentTextIcon',
  10,
  true,
  'Edita e testa templates de prompt do sistema.',
  (SELECT id FROM public.system_features WHERE slug = 'master-prompts-editor' LIMIT 1)
)
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================================
-- Verificação (execute separado para confirmar):
-- SELECT sf.id, sf.name, sf.slug, sf.url
--   FROM public.system_features sf
--   WHERE sf.slug = 'master-prompts-editor';
--
-- SELECT smi.id, smi.parent_id, smi.name, smi.url, smi.order_index, smi.feature_id
--   FROM public.sidebar_menu_items smi
--   WHERE smi.url = '/admin/master/prompts';
-- ============================================================

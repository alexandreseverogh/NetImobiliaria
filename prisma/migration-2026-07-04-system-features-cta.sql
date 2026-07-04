-- ============================================================
-- Migration 2026-07-04: Features CTA (Destinos, Analytics, Mecanismos)
-- A sidebar do admin é construída via get_sidebar_menu_for_user() que lê
-- system_features, NÃO sidebar_menu_items.  Para aparecer no menu é
-- obrigatório: (a) entrada em system_features, (b) tenant_feature_overrides.
-- ============================================================

BEGIN;

-- 1. Inserir as 3 novas features na categoria "Campanhas de Marketing Digital" (id=30)
--    Slug explícito → trigger só gera quando NULL
INSERT INTO public.system_features
  (name, slug, category_id, url, icon, is_active, is_default_tenant_admin_feature, sort_order)
VALUES
  ('Destinos de CTA',      'cta-destinos',       30, '/admin/campanhas/destinos',      'lucide-Link2',     true, true, 41),
  ('Analytics de Captura', 'cta-analytics',      30, '/admin/campanhas/cta-analytics', 'lucide-BarChart3', true, true, 42),
  ('Mecanismos',           'cta-mecanismos',     30, '/admin/campanhas/mecanismos',    'lucide-Signal',    true, true, 43)
ON CONFLICT (slug) DO UPDATE
  SET is_active = true,
      is_default_tenant_admin_feature = true,
      url      = EXCLUDED.url,
      icon     = EXCLUDED.icon,
      sort_order = EXCLUDED.sort_order;

-- 2. Provisionar para TODOS os tenants ativos
--    (tenant_feature_overrides — FILTRO B da função get_sidebar_menu_for_user)
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active)
SELECT t.id, sf.id, true
FROM public.tenants t
CROSS JOIN public.system_features sf
WHERE t.status = 'active'
  AND sf.slug IN ('cta-destinos', 'cta-analytics', 'cta-mecanismos')
ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_active = true;

-- 3. Vincular os sidebar_menu_items que já existem (ids 122-124) às features novas
--    (melhora a consistência no designer de sidebar, mesmo que não afete o menu real)
UPDATE public.sidebar_menu_items smi
SET feature_id = sf.id
FROM public.system_features sf
WHERE sf.slug = 'cta-destinos'   AND smi.url = '/admin/campanhas/destinos';

UPDATE public.sidebar_menu_items smi
SET feature_id = sf.id
FROM public.system_features sf
WHERE sf.slug = 'cta-analytics'  AND smi.url = '/admin/campanhas/cta-analytics';

UPDATE public.sidebar_menu_items smi
SET feature_id = sf.id
FROM public.system_features sf
WHERE sf.slug = 'cta-mecanismos' AND smi.url = '/admin/campanhas/mecanismos';

COMMIT;

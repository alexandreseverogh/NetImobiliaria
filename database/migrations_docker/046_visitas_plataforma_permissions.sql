-- =====================================================
-- 046_visitas_plataforma_permissions.sql
-- Permissões e item de sidebar para Visitas Plataforma
-- A feature (id=60, slug='visita-plataforma') já existe em system_features
-- =====================================================

-- 1. Criar permission READ para a feature (idempotente)
INSERT INTO public.permissions (feature_id, action, description)
SELECT
  sf.id,
  'read',
  'Permite visualizar o dashboard de visitas ao site público'
FROM public.system_features sf
WHERE sf.slug = 'visita-plataforma'
AND NOT EXISTS (
  SELECT 1 FROM public.permissions p WHERE p.feature_id = sf.id AND p.action = 'read'
);

-- 2. Adicionar item na sidebar, filho do grupo Dashboards (parent_id=8)
INSERT INTO public.sidebar_menu_items
  (name, url, icon_name, order_index, parent_id, feature_id, is_active)
SELECT
  'Visitas Plataforma',
  '/admin/visitas-plataforma',
  'ChartBarIcon',
  2,   -- segundo item dentro do grupo Dashboards (após /admin/dashboards que é ord=1)
  8,   -- parent_id=8 (grupo "Dashboards" raiz)
  sf.id,
  true
FROM public.system_features sf
WHERE sf.slug = 'visita-plataforma'
AND NOT EXISTS (
  SELECT 1 FROM public.sidebar_menu_items WHERE url = '/admin/visitas-plataforma'
);

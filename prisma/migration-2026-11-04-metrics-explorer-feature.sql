-- Catálogo de Métricas Dinâmico — Fase 3 (Explorador de Métricas). Mesmo padrão de toda
-- feature nova de Campanhas nesta plataforma (ver docs/ACCESS_CONTROL.md). Deliberadamente NÃO
-- provisiona pra nenhum tenant ainda (tenant_feature_overrides) — o Master decide quando, via
-- /admin/master/provisioning, mesmo padrão já usado em migration-2026-09-05-audiences-feature.sql.

INSERT INTO public.system_features (name, slug, url, category_id, sort_order, is_active, icon)
VALUES ('Explorador de Métricas', 'campanhas-metrics-explorer', '/admin/campanhas/explorador-metricas', 30, 11, true, 'TableCellsIcon')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.system_feature_modules (feature_id, module_id)
SELECT sf.id, sm.id
  FROM public.system_features sf, public.system_modules sm
 WHERE sf.slug = 'campanhas-metrics-explorer' AND sm.slug = 'trafego-pago'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (feature_id, action)
SELECT sf.id, a.action
  FROM public.system_features sf, (VALUES ('read'), ('execute')) AS a(action)
 WHERE sf.slug = 'campanhas-metrics-explorer'
ON CONFLICT (feature_id, action) DO NOTHING;

-- Tier 3 do plano "Loop do ICP" — cadastra a feature "Audiências (Lookalike/Custom)" no
-- catálogo real, mesmo padrão de toda feature nova de Campanhas nesta plataforma (ver
-- docs/ACCESS_CONTROL.md). Deliberadamente NÃO provisiona pra nenhum tenant real ainda
-- (tenant_feature_overrides) — feature nova, sem teste real contra a API da Meta ainda
-- (nenhuma conta de anúncio de teste disponível); o Master decide quando provisionar, via
-- /admin/master/provisioning, quando isso estiver confirmado.

INSERT INTO public.system_features (name, slug, url, category_id, sort_order, is_active, icon)
VALUES ('Audiências (Lookalike/Custom)', 'campanhas-audiences', '/admin/campanhas/audiences', 30, 10, true, 'UserGroupIcon')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.system_feature_modules (feature_id, module_id)
SELECT sf.id, sm.id
  FROM public.system_features sf, public.system_modules sm
 WHERE sf.slug = 'campanhas-audiences' AND sm.slug = 'trafego-pago'
ON CONFLICT DO NOTHING;

INSERT INTO public.permissions (feature_id, action)
SELECT sf.id, a.action
  FROM public.system_features sf, (VALUES ('read'), ('update'), ('execute')) AS a(action)
 WHERE sf.slug = 'campanhas-audiences'
ON CONFLICT (feature_id, action) DO NOTHING;

-- ============================================================
-- FASE 10 — Portfolio Dashboard + Cross-Pollination: sidebar
-- 2026-06-02
-- ============================================================
-- ATENÇÃO: O sidebar usa system_features (não sidebar_menu_items).
-- Para aparecer no menu o item precisa de:
--  1. system_features (category_id + is_active)
--  2. permissions (read + execute)
--  3. role_permissions (para cada role que deve ter acesso)
--  4. tenant_feature_overrides (para cada tenant não-Master)
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. Features em system_features
-- ──────────────────────────────────────────────────────────────

-- 1a. Portfolio de Clientes
INSERT INTO public.system_features
  (name, description, category_id, url, is_active, slug, sort_order, icon, created_at, updated_at)
SELECT
  'Portfolio de Clientes',
  'Visão consolidada de todos os clientes do tenant: métricas agregadas, CPL por segmento, status de saúde e benchmarks',
  30,
  '/admin/campanhas/portfolio',
  true,
  'campanhas-portfolio',
  8,
  'Briefcase',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_features WHERE url = '/admin/campanhas/portfolio'
);

-- 1b. Insights Cruzados (sub-rota, sem item no menu principal)
INSERT INTO public.system_features
  (name, description, category_id, url, is_active, slug, sort_order, icon, created_at, updated_at)
SELECT
  'Insights Cruzados',
  'Cross-pollination entre clientes: oportunidades, alertas e padrões detectados automaticamente com narrativa LLM opcional',
  30,
  '/admin/campanhas/portfolio/cross-insights',
  true,
  'campanhas-cross-insights',
  9,
  'Sparkles',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_features WHERE url = '/admin/campanhas/portfolio/cross-insights'
);

-- ──────────────────────────────────────────────────────────────
-- 2. Permissions para Portfolio
-- ──────────────────────────────────────────────────────────────

INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
SELECT sf.id, 'read', 'Visualizar portfolio consolidado de clientes', false, NOW()
FROM public.system_features sf
WHERE sf.url = '/admin/campanhas/portfolio'
  AND NOT EXISTS (
    SELECT 1 FROM public.permissions p WHERE p.feature_id = sf.id AND p.action = 'read'
  );

INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
SELECT sf.id, 'execute', 'Gerar análise IA de portfolio com narrativa LLM', false, NOW()
FROM public.system_features sf
WHERE sf.url = '/admin/campanhas/portfolio'
  AND NOT EXISTS (
    SELECT 1 FROM public.permissions p WHERE p.feature_id = sf.id AND p.action = 'execute'
  );

-- ──────────────────────────────────────────────────────────────
-- 3. Permissions para Cross-Insights
-- ──────────────────────────────────────────────────────────────

INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
SELECT sf.id, 'read', 'Visualizar insights cruzados entre clientes', false, NOW()
FROM public.system_features sf
WHERE sf.url = '/admin/campanhas/portfolio/cross-insights'
  AND NOT EXISTS (
    SELECT 1 FROM public.permissions p WHERE p.feature_id = sf.id AND p.action = 'read'
  );

INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
SELECT sf.id, 'execute', 'Gerar narrativa LLM de cross-pollination', false, NOW()
FROM public.system_features sf
WHERE sf.url = '/admin/campanhas/portfolio/cross-insights'
  AND NOT EXISTS (
    SELECT 1 FROM public.permissions p WHERE p.feature_id = sf.id AND p.action = 'execute'
  );

-- ──────────────────────────────────────────────────────────────
-- 4. role_permissions — espelha roles da auditoria (mesmos roles)
-- ──────────────────────────────────────────────────────────────

-- Portfolio
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT src_rp.role_id, new_p.id
FROM public.permissions new_p
JOIN public.system_features new_sf ON new_sf.id = new_p.feature_id
  AND new_sf.url = '/admin/campanhas/portfolio'
CROSS JOIN (
    SELECT DISTINCT rp.role_id
    FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.system_features sf ON sf.id = p.feature_id
      AND sf.url = '/admin/campanhas/auditoria'
) src_rp
WHERE NOT EXISTS (
    SELECT 1 FROM public.role_permissions x
    WHERE x.role_id = src_rp.role_id AND x.permission_id = new_p.id
);

-- Cross-Insights
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT src_rp.role_id, new_p.id
FROM public.permissions new_p
JOIN public.system_features new_sf ON new_sf.id = new_p.feature_id
  AND new_sf.url = '/admin/campanhas/portfolio/cross-insights'
CROSS JOIN (
    SELECT DISTINCT rp.role_id
    FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.system_features sf ON sf.id = p.feature_id
      AND sf.url = '/admin/campanhas/auditoria'
) src_rp
WHERE NOT EXISTS (
    SELECT 1 FROM public.role_permissions x
    WHERE x.role_id = src_rp.role_id AND x.permission_id = new_p.id
);

-- ──────────────────────────────────────────────────────────────
-- 5. tenant_feature_overrides — provisiona para os mesmos tenants
--    que já têm acesso à auditoria
-- ──────────────────────────────────────────────────────────────

-- Portfolio
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active, created_at, updated_at)
SELECT DISTINCT src_tfo.tenant_id, new_sf.id, true, NOW(), NOW()
FROM public.tenant_feature_overrides src_tfo
JOIN public.system_features src_sf ON src_sf.id = src_tfo.feature_id
  AND src_sf.url = '/admin/campanhas/auditoria'
JOIN public.system_features new_sf ON new_sf.url = '/admin/campanhas/portfolio'
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_feature_overrides x
    WHERE x.tenant_id = src_tfo.tenant_id AND x.feature_id = new_sf.id
);

-- Cross-Insights
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active, created_at, updated_at)
SELECT DISTINCT src_tfo.tenant_id, new_sf.id, true, NOW(), NOW()
FROM public.tenant_feature_overrides src_tfo
JOIN public.system_features src_sf ON src_sf.id = src_tfo.feature_id
  AND src_sf.url = '/admin/campanhas/auditoria'
JOIN public.system_features new_sf ON new_sf.url = '/admin/campanhas/portfolio/cross-insights'
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_feature_overrides x
    WHERE x.tenant_id = src_tfo.tenant_id AND x.feature_id = new_sf.id
);

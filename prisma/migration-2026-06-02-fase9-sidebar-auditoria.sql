-- ============================================================
-- FASE 9 — Auditoria de Campanhas: sidebar provisioning
-- 2026-06-02
-- ============================================================
-- ATENÇÃO: O sidebar usa system_features (não sidebar_menu_items).
-- Para aparecer no menu o item precisa de:
--  1. system_features (category_id + is_active)
--  2. permissions (read + execute)
--  3. role_permissions (para cada role que deve ter acesso)
--  4. tenant_feature_overrides (para cada tenant não-Master)
-- ============================================================

-- 1. Feature em system_features
INSERT INTO public.system_features
  (name, description, category_id, url, is_active, slug, sort_order, icon, created_at, updated_at)
SELECT
  'Auditoria de Campanhas',
  'Relatório estruturado mensal/semanal com scorecard de saúde, problemas, oportunidades e plano de ação',
  30,
  '/admin/campanhas/auditoria',
  true,
  'campanhas-auditoria',
  7,
  'ClipboardList',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_features WHERE url = '/admin/campanhas/auditoria'
);

-- 2. Permissions
INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
SELECT sf.id, 'read', 'Visualizar relatório de auditoria de campanhas', false, NOW()
FROM public.system_features sf
WHERE sf.url = '/admin/campanhas/auditoria'
  AND NOT EXISTS (
    SELECT 1 FROM public.permissions p WHERE p.feature_id = sf.id AND p.action = 'read'
  );

INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
SELECT sf.id, 'execute', 'Gerar relatório de auditoria com narrativa LLM', false, NOW()
FROM public.system_features sf
WHERE sf.url = '/admin/campanhas/auditoria'
  AND NOT EXISTS (
    SELECT 1 FROM public.permissions p WHERE p.feature_id = sf.id AND p.action = 'execute'
  );

-- 3. role_permissions — espelha roles do desperdício (IDs 41=Master, 42=Admin, 47=Admin)
-- Usa subquery dinâmica para não depender de IDs hardcoded
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT dp_rp.role_id, new_p.id
FROM public.permissions new_p
JOIN public.system_features new_sf ON new_sf.id = new_p.feature_id AND new_sf.url = '/admin/campanhas/auditoria'
CROSS JOIN (
    SELECT DISTINCT rp.role_id
    FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.system_features sf ON sf.id = p.feature_id AND sf.url = '/admin/campanhas/desperdicio'
) dp_rp
WHERE NOT EXISTS (
    SELECT 1 FROM public.role_permissions x
    WHERE x.role_id = dp_rp.role_id AND x.permission_id = new_p.id
);

-- 4. tenant_feature_overrides — provisiona para todos os tenants que têm desperdício
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active, created_at, updated_at)
SELECT DISTINCT tfo_desp.tenant_id, new_sf.id, true, NOW(), NOW()
FROM public.tenant_feature_overrides tfo_desp
JOIN public.system_features desp_sf ON desp_sf.id = tfo_desp.feature_id AND desp_sf.url = '/admin/campanhas/desperdicio'
JOIN public.system_features new_sf ON new_sf.url = '/admin/campanhas/auditoria'
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_feature_overrides x
    WHERE x.tenant_id = tfo_desp.tenant_id AND x.feature_id = new_sf.id
);

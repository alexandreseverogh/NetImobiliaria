-- ============================================================
-- CRM — Atividades por Lead: item na sidebar (categoria "Configurações CRM")
-- 2026-08-04
-- ============================================================
-- ATENÇÃO: O sidebar usa system_features (não sidebar_menu_items).
-- Para aparecer no menu o item precisa de:
--  1. system_features (category_id + is_active)
--  2. permissions (read/write/delete/admin)
--  3. role_permissions (para cada role que deve ter acesso)
--  4. tenant_feature_overrides (para cada tenant não-Master)
--
-- Espelha exatamente o padrão já usado pela feature irmã "Personalização
-- Kanban" (id 75, mesma categoria 25 "Configurações CRM") — administrador
-- do tenant tem acesso (bypassa via v_is_tenant_admin, mas a permissão é
-- concedida explicitamente do mesmo jeito) + qualquer usuário/role a quem
-- for concedida a permissão explicitamente.
-- ============================================================

-- 1. Feature
INSERT INTO public.system_features
  (name, description, category_id, url, is_active, slug, sort_order, icon, created_at, updated_at)
SELECT
  'Catálogo de Atividades',
  'Gerencia os tipos padronizados de atividade usados ao registrar o histórico de cada lead do Kanban (por tenant ou por cliente específico)',
  25,
  '/crm/config/atividades',
  true,
  'crm-atividades-config',
  1,
  'clipboarddocumentlisticon',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_features WHERE url = '/crm/config/atividades'
);

-- 2. Permissions
INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
SELECT sf.id, action.name, action.description, false, NOW()
FROM public.system_features sf
CROSS JOIN (VALUES
  ('read',   'Visualizar catálogo de tipos de atividade'),
  ('write',  'Criar/editar tipos de atividade'),
  ('delete', 'Desativar tipos de atividade'),
  ('admin',  'Administração completa do catálogo de atividades')
) AS action(name, description)
WHERE sf.url = '/crm/config/atividades'
  AND NOT EXISTS (
    SELECT 1 FROM public.permissions p WHERE p.feature_id = sf.id AND p.action = action.name
  );

-- 3. role_permissions — espelha os roles que já têm acesso à Personalização do Kanban
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT src_rp.role_id, new_p.id
FROM public.permissions new_p
JOIN public.system_features new_sf ON new_sf.id = new_p.feature_id
  AND new_sf.url = '/crm/config/atividades'
CROSS JOIN (
    SELECT DISTINCT rp.role_id
    FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.system_features sf ON sf.id = p.feature_id
      AND sf.url = '/crm/config/kanban'
) src_rp
WHERE NOT EXISTS (
    SELECT 1 FROM public.role_permissions x
    WHERE x.role_id = src_rp.role_id AND x.permission_id = new_p.id
);

-- 4. tenant_feature_overrides — provisiona para os mesmos tenants que já têm
--    acesso à Personalização do Kanban (todo tenant com CRM configurado)
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active, created_at, updated_at)
SELECT DISTINCT src_tfo.tenant_id, new_sf.id, true, NOW(), NOW()
FROM public.tenant_feature_overrides src_tfo
JOIN public.system_features src_sf ON src_sf.id = src_tfo.feature_id
  AND src_sf.url = '/crm/config/kanban'
JOIN public.system_features new_sf ON new_sf.url = '/crm/config/atividades'
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_feature_overrides x
    WHERE x.tenant_id = src_tfo.tenant_id AND x.feature_id = new_sf.id
);

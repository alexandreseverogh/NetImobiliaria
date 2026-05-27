-- ============================================================
-- FASE 0–3: Provisioning de Permissões para Campanhas de Marketing
-- ============================================================
-- Torna as UIs criadas nas Fases 0–3 acessíveis pelo sistema
-- de permissões (get_sidebar_menu_for_user + RBAC).
--
-- Tabelas envolvidas:
--   system_features          → cada funcionalidade visível na sidebar
--   permissions              → ações possíveis por funcionalidade
--   role_permissions         → quais roles têm quais permissões
--   tenant_feature_overrides → quais funcionalidades estão provisionadas por tenant
--
-- IDEMPOTENTE: ON CONFLICT DO NOTHING / WHERE NOT EXISTS
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. Novas system_features (FASE 2 e FASE 3)
--    As features pre-existentes (92–95) já estão no banco.
-- ────────────────────────────────────────────────────────────
INSERT INTO public.system_features
  (name, slug, url, category_id, sort_order, is_active)
VALUES
  ('Iniciativas de Marketing', 'iniciativas-campanhas', '/admin/campanhas/iniciativas', 30, 20, true),
  ('Análise de Desperdício',   'desperdicio-campanhas', '/admin/campanhas/desperdicio', 30, 21, true)
ON CONFLICT (slug) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 2. Permissions para TODAS as features de Campanhas (cat. 30)
--    Inclui as 4 pre-existentes (92–95) que nunca tiveram permissões
--    e as 2 novas inseridas acima.
-- ────────────────────────────────────────────────────────────

-- Fase pre-existente: dashboard-campanhas (id=93) — somente leitura
INSERT INTO public.permissions (feature_id, action, description)
VALUES (93, 'read', 'Visualizar painel de campanhas')
ON CONFLICT (feature_id, action) DO NOTHING;

-- Fase pre-existente: leads-campanhas (id=94) — leitura + execução (IA)
INSERT INTO public.permissions (feature_id, action, description)
VALUES
  (94, 'read',    'Visualizar leads de campanhas'),
  (94, 'execute', 'Ações avançadas e IA em leads')
ON CONFLICT (feature_id, action) DO NOTHING;

-- Fase pre-existente: importacao-criativos (id=92) — CRUD + execução
INSERT INTO public.permissions (feature_id, action, description)
VALUES
  (92, 'read',    'Visualizar criativos'),
  (92, 'create',  'Importar criativos'),
  (92, 'update',  'Editar criativos'),
  (92, 'delete',  'Excluir criativos'),
  (92, 'execute', 'Gerar análise IA para criativos')
ON CONFLICT (feature_id, action) DO NOTHING;

-- Fase pre-existente: configuracoes-campanhas (id=95) — CRUD + execução
-- Cobre também /admin/campanhas/configuracoes/redes (FASE 1)
INSERT INTO public.permissions (feature_id, action, description)
VALUES
  (95, 'read',    'Visualizar configurações de campanhas'),
  (95, 'create',  'Criar configurações'),
  (95, 'update',  'Atualizar configurações'),
  (95, 'delete',  'Excluir configurações'),
  (95, 'execute', 'Executar operações de configuração')
ON CONFLICT (feature_id, action) DO NOTHING;

-- FASE 2: iniciativas-campanhas — CRUD + execução (AI briefing)
INSERT INTO public.permissions (feature_id, action, description)
SELECT sf.id, p.action, p.description
FROM public.system_features sf
CROSS JOIN (VALUES
  ('read',    'Visualizar iniciativas de marketing'),
  ('create',  'Criar iniciativas de marketing'),
  ('update',  'Editar iniciativas de marketing'),
  ('delete',  'Excluir iniciativas de marketing'),
  ('execute', 'Gerar briefing consolidado com IA')
) AS p(action, description)
WHERE sf.slug = 'iniciativas-campanhas'
ON CONFLICT (feature_id, action) DO NOTHING;

-- FASE 3: desperdicio-campanhas — leitura + execução (AI narrativa)
INSERT INTO public.permissions (feature_id, action, description)
SELECT sf.id, p.action, p.description
FROM public.system_features sf
CROSS JOIN (VALUES
  ('read',    'Visualizar análise de desperdício de verba'),
  ('execute', 'Gerar narrativa executiva com IA')
) AS p(action, description)
WHERE sf.slug = 'desperdicio-campanhas'
ON CONFLICT (feature_id, action) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 3. role_permissions: Administrador recebe todas as permissões
--    de campanhas. Corretor não tem acesso (gestão de marketing).
-- ────────────────────────────────────────────────────────────
-- Administrador (role ids 42 e 47 — um por tenant)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT ur.id, p.id
FROM public.user_roles ur
CROSS JOIN public.permissions p
JOIN public.system_features sf ON sf.id = p.feature_id
WHERE sf.category_id = 30
  AND ur.name ILIKE 'Administrador'
  AND ur.is_system_role = false
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Master Platform role recebe todas (para garantir visibilidade no tenant master)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT ur.id, p.id
FROM public.user_roles ur
CROSS JOIN public.permissions p
JOIN public.system_features sf ON sf.id = p.feature_id
WHERE sf.category_id = 30
  AND ur.is_system_role = true
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 4. tenant_feature_overrides: provisionar todas as features de
--    campanhas para todos os tenants ativos (exceto Master Platform)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active)
SELECT t.id, sf.id, true
FROM public.tenants t
CROSS JOIN public.system_features sf
WHERE t.status = 'active'
  AND t.id != '00000000-0000-0000-0000-000000000001'  -- tenant Master Platform dispensa override
  AND sf.category_id = 30
ON CONFLICT (tenant_id, feature_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 5. route_permissions_config — mapeamento UI + API routes
--    (base para enforcement futuro de permissões por rota)
-- ────────────────────────────────────────────────────────────

-- UI routes — dashboard / leads / criativos / configurações (pre-existentes)
INSERT INTO public.route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth)
SELECT rp.route_pattern, rp.method, sf.id, rp.default_action, true
FROM (VALUES
  ('/admin/campanhas/dashboard',              'GET',    'dashboard-campanhas',     'READ'),
  ('/admin/campanhas/leads',                  'GET',    'leads-campanhas',         'READ'),
  ('/admin/campanhas/criativos',              'GET',    'importacao-criativos',    'READ'),
  ('/admin/campanhas/configuracoes',          'GET',    'configuracoes-campanhas', 'READ'),
  ('/admin/campanhas/configuracoes/redes',    'GET',    'configuracoes-campanhas', 'READ'),
  -- UI routes — FASE 2: iniciativas
  ('/admin/campanhas/iniciativas',            'GET',    'iniciativas-campanhas',   'READ'),
  ('/admin/campanhas/iniciativas/nova',       'GET',    'iniciativas-campanhas',   'CREATE'),
  ('/admin/campanhas/iniciativas/[id]',       'GET',    'iniciativas-campanhas',   'READ'),
  -- UI routes — FASE 3: desperdicio
  ('/admin/campanhas/desperdicio',            'GET',    'desperdicio-campanhas',   'READ')
) AS rp(route_pattern, method, slug, default_action)
JOIN public.system_features sf ON sf.slug = rp.slug
ON CONFLICT (route_pattern, method) DO NOTHING;

-- API routes — iniciativas (FASE 2)
INSERT INTO public.route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth)
SELECT rp.route_pattern, rp.method, sf.id, rp.default_action, true
FROM (VALUES
  ('/api/admin/campanhas/iniciativas',                     'GET',    'iniciativas-campanhas', 'READ'),
  ('/api/admin/campanhas/iniciativas',                     'POST',   'iniciativas-campanhas', 'CREATE'),
  ('/api/admin/campanhas/iniciativas/[id]',                'GET',    'iniciativas-campanhas', 'READ'),
  ('/api/admin/campanhas/iniciativas/[id]',                'PATCH',  'iniciativas-campanhas', 'UPDATE'),
  ('/api/admin/campanhas/iniciativas/[id]',                'DELETE', 'iniciativas-campanhas', 'DELETE'),
  ('/api/admin/campanhas/iniciativas/[id]/briefing',       'POST',   'iniciativas-campanhas', 'EXECUTE'),
  ('/api/admin/campanhas/iniciativas/[id]/campaigns',      'POST',   'iniciativas-campanhas', 'UPDATE'),
  -- API routes — desperdicio (FASE 3)
  ('/api/admin/campanhas/desperdicio',                     'GET',    'desperdicio-campanhas', 'READ'),
  ('/api/admin/campanhas/desperdicio/narrativa',           'POST',   'desperdicio-campanhas', 'EXECUTE')
) AS rp(route_pattern, method, slug, default_action)
JOIN public.system_features sf ON sf.slug = rp.slug
ON CONFLICT (route_pattern, method) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 6. Vincular novas features ao módulo de campanhas
--    (necessário para aparecerem na tela de provisionamento)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.system_feature_modules (feature_id, module_id)
SELECT sf.id, sm.id
FROM public.system_features sf
CROSS JOIN public.system_modules sm
WHERE sf.slug IN ('iniciativas-campanhas', 'desperdicio-campanhas')
  AND sm.slug = 'trafego-pago'
ON CONFLICT (feature_id, module_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 7. Registro da migration
-- ────────────────────────────────────────────────────────────
INSERT INTO public.schema_migrations (filename, applied_at)
VALUES ('migration-2026-05-fase0a3-permissions.sql', NOW())
ON CONFLICT (filename) DO NOTHING;

COMMIT;

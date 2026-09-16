-- ============================================================================
-- G4 — Fila de Resgate na sidebar (categoria "CRM", operacional)
-- Data: 2026-08-08
-- Plano: docs/PLANO_PENDENCIA_ATENDIMENTO.md §4 (degrau 4) e §6.6
-- APLICAR VIA psql — NUNCA `prisma db push`
--   docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria \
--     < prisma/migration-2026-08-08-pendencia-atendimento-g4-sidebar.sql
--
-- O sidebar usa system_features (não sidebar_menu_items). Para aparecer no menu:
--   1. system_features (category_id + is_active + url NÃO vazia)
--   2. permissions (read/write/delete/admin)
--   3. role_permissions (por role com acesso)
--   4. tenant_feature_overrides (por tenant não-Master)
-- Mesmo padrão da feature "Catálogo de Atividades" (migration-2026-08-04).
--
-- Categoria 19 ("CRM"), NÃO 25 ("Configurações CRM"): a fila de resgate é operação do dia a
-- dia — leads que estão esperando atendimento AGORA — e não configuração. Espelha os roles e
-- tenants que já têm acesso ao Kanban de Leads, que é a tela operacional irmã.
-- ============================================================================

-- 1. Feature
INSERT INTO public.system_features
  (name, description, category_id, url, is_active, slug, sort_order, icon, created_at, updated_at)
SELECT
  'Fila de Resgate',
  'Leads que estão aguardando uma ação da equipe e que o sistema não conseguiu resolver sozinho — sem responsável atribuído, ou com a escada de escalonamento já esgotada',
  19,
  '/crm/resgate',
  true,
  'crm-fila-resgate',
  0,
  'exclamationtriangleicon',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_features WHERE url = '/crm/resgate'
);

-- 2. Permissions
INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
SELECT sf.id, action.name, action.description, false, NOW()
FROM public.system_features sf
CROSS JOIN (VALUES
  ('read',   'Visualizar a fila de resgate'),
  ('write',  'Agir sobre leads da fila de resgate'),
  ('delete', 'Remover itens da fila de resgate'),
  ('admin',  'Administração completa da fila de resgate')
) AS action(name, description)
WHERE sf.url = '/crm/resgate'
  AND NOT EXISTS (
    SELECT 1 FROM public.permissions p WHERE p.feature_id = sf.id AND p.action = action.name
  );

-- 3. role_permissions — espelha os roles que já têm acesso ao Kanban de Leads
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT src_rp.role_id, new_p.id
FROM public.permissions new_p
JOIN public.system_features new_sf ON new_sf.id = new_p.feature_id
  AND new_sf.url = '/crm/resgate'
CROSS JOIN (
    SELECT DISTINCT rp.role_id
    FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.system_features sf ON sf.id = p.feature_id
      AND sf.url = '/crm/kanban'
) src_rp
WHERE NOT EXISTS (
    SELECT 1 FROM public.role_permissions x
    WHERE x.role_id = src_rp.role_id AND x.permission_id = new_p.id
);

-- 4. tenant_feature_overrides — mesmos tenants que já têm o Kanban provisionado
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active, created_at, updated_at)
SELECT DISTINCT src_tfo.tenant_id, new_sf.id, true, NOW(), NOW()
FROM public.tenant_feature_overrides src_tfo
JOIN public.system_features src_sf ON src_sf.id = src_tfo.feature_id
  AND src_sf.url = '/crm/kanban'
JOIN public.system_features new_sf ON new_sf.url = '/crm/resgate'
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_feature_overrides x
    WHERE x.tenant_id = src_tfo.tenant_id AND x.feature_id = new_sf.id
);

-- ============================================================================
-- FIM.
-- ============================================================================

-- ============================================================
-- CRM — Agentes de Aceleração: override do tenant, item na sidebar
-- (categoria "Configurações CRM")
-- 2026-08-06
-- ============================================================
-- Fecha o gap real achado pelo usuário: o modal da Master
-- (SegmentAgentesModal.tsx) sempre disse "cada tenant pode sobrepor em
-- /crm/config/agentes", mas essa página nunca existiu — o mecanismo de
-- override (crm_agentes_config_tenant) só era gravável via SQL direto.
--
-- Espelha exatamente o padrão já usado pela feature irmã "Catálogo de
-- Atividades" (id 119, mesma categoria 25 "Configurações CRM") —
-- mesmos 4 passos: system_features + permissions + role_permissions +
-- tenant_feature_overrides, todos idempotentes.
-- ============================================================

-- 1. Feature
INSERT INTO public.system_features
  (name, description, category_id, url, is_active, slug, sort_order, icon, created_at, updated_at)
SELECT
  'Agentes de Aceleração (CRM)',
  'Liga/desliga os agentes de aceleração do CRM (velocidade de 1º contato, estagnação por etapa, próxima ação sugerida) e ajusta os parâmetros deles para este tenant, sobrepondo o padrão curado pela Master para o segmento',
  25,
  '/crm/config/agentes',
  true,
  'crm-agentes-config',
  2,
  'lucide-Zap',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_features WHERE url = '/crm/config/agentes'
);

-- 2. Permissions
INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
SELECT sf.id, action.name, action.description, false, NOW()
FROM public.system_features sf
CROSS JOIN (VALUES
  ('read',   'Visualizar agentes de aceleração e seus parâmetros'),
  ('write',  'Ligar/desligar agentes e ajustar parâmetros para este tenant'),
  ('delete', 'Remover override do tenant (voltar a herdar o padrão do segmento)'),
  ('admin',  'Administração completa dos agentes de aceleração deste tenant')
) AS action(name, description)
WHERE sf.url = '/crm/config/agentes'
  AND NOT EXISTS (
    SELECT 1 FROM public.permissions p WHERE p.feature_id = sf.id AND p.action = action.name
  );

-- 3. role_permissions — espelha os roles que já têm acesso à Personalização do Kanban
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT src_rp.role_id, new_p.id
FROM public.permissions new_p
JOIN public.system_features new_sf ON new_sf.id = new_p.feature_id
  AND new_sf.url = '/crm/config/agentes'
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
JOIN public.system_features new_sf ON new_sf.url = '/crm/config/agentes'
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_feature_overrides x
    WHERE x.tenant_id = src_tfo.tenant_id AND x.feature_id = new_sf.id
);

-- ============================================================
-- CRM — Temas do ciclo de vendas (por tenant)
-- 2026-11-14
-- ============================================================
-- Ex.: imobiliária com "Venda de Imóveis" e "Aluguel de Imóveis" como temas.
-- Idempotente: pode rodar mais de uma vez.

-- 1. Tabela de temas, por tenant
CREATE TABLE IF NOT EXISTS public.temas (
  id          SERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  nome        VARCHAR(120) NOT NULL,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_temas_tenant_nome_ativo
  ON public.temas (tenant_id, nome)
  WHERE ativo = true;

CREATE INDEX IF NOT EXISTS idx_temas_tenant
  ON public.temas (tenant_id);

-- 2. Tema do lead (nulo = lead sem tema, ex.: leads antigos)
ALTER TABLE public.leads_staging
  ADD COLUMN IF NOT EXISTS tema_id INTEGER REFERENCES public.temas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_staging_tema
  ON public.leads_staging (tema_id)
  WHERE tema_id IS NOT NULL;

-- 3. Item na sidebar: categoria "Configurações CRM" (id 25), abaixo de "Catálogo de Atividades"
INSERT INTO public.system_features
  (name, description, category_id, url, is_active, slug, sort_order, icon, created_at, updated_at)
SELECT
  'Temas do Ciclo de Vendas',
  'Cadastra os temas do ciclo de vendas do tenant (ex.: Venda de Imóveis, Aluguel de Imóveis) usados para filtrar o Kanban e a lista de leads',
  25,
  '/crm/config/temas',
  true,
  'crm-temas-config',
  2,
  'clipboarddocumentlisticon',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_features WHERE url = '/crm/config/temas'
);

-- 4. Permissions
INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
SELECT sf.id, action.name, action.description, false, NOW()
FROM public.system_features sf
CROSS JOIN (VALUES
  ('read',   'Visualizar temas do ciclo de vendas'),
  ('write',  'Criar/editar temas do ciclo de vendas'),
  ('delete', 'Desativar temas do ciclo de vendas'),
  ('admin',  'Administração completa dos temas do ciclo de vendas')
) AS action(name, description)
WHERE sf.url = '/crm/config/temas'
  AND NOT EXISTS (
    SELECT 1 FROM public.permissions p WHERE p.feature_id = sf.id AND p.action = action.name
  );

-- 5. role_permissions — mesmos roles que já acessam o Catálogo de Atividades
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT src_rp.role_id, new_p.id
FROM public.permissions new_p
JOIN public.system_features new_sf ON new_sf.id = new_p.feature_id
  AND new_sf.url = '/crm/config/temas'
CROSS JOIN (
    SELECT DISTINCT rp.role_id
    FROM public.role_permissions rp
    JOIN public.permissions p ON p.id = rp.permission_id
    JOIN public.system_features sf ON sf.id = p.feature_id
      AND sf.url = '/crm/config/atividades'
) src_rp
WHERE NOT EXISTS (
    SELECT 1 FROM public.role_permissions x
    WHERE x.role_id = src_rp.role_id AND x.permission_id = new_p.id
);

-- 6. tenant_feature_overrides — provisiona para os tenants que já têm o Catálogo de Atividades
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active, created_at, updated_at)
SELECT DISTINCT src_tfo.tenant_id, new_sf.id, true, NOW(), NOW()
FROM public.tenant_feature_overrides src_tfo
JOIN public.system_features src_sf ON src_sf.id = src_tfo.feature_id
  AND src_sf.url = '/crm/config/atividades'
JOIN public.system_features new_sf ON new_sf.url = '/crm/config/temas'
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_feature_overrides x
    WHERE x.tenant_id = src_tfo.tenant_id AND x.feature_id = new_sf.id
);

-- 7. Provisionamento explícito do tenant "Artemis9 - Testes"
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active, created_at, updated_at)
SELECT t.id, sf.id, true, NOW(), NOW()
FROM public.tenants t
JOIN public.system_features sf ON sf.url = '/crm/config/temas'
WHERE t.name = 'Artemis9 - Testes'
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_feature_overrides x
    WHERE x.tenant_id = t.id AND x.feature_id = sf.id
  );

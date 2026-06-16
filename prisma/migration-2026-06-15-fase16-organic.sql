-- ============================================================
-- FASE 16.A — Postagem Orgânica no Meta: fundação
-- 2026-06-15
-- ------------------------------------------------------------
--  1. Tabela OrganicPost (registro de publicações orgânicas)
--  2. system_features + permissions + role_permissions + tenant_feature_overrides
-- ============================================================

-- ── 1. Tabela OrganicPost ──────────────────────────────────
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."OrganicPost" (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL,
  client_id        uuid,                              -- cascata (own = NULL)
  platform         varchar(20)  NOT NULL,             -- facebook | instagram
  format           varchar(20)  NOT NULL,             -- image|carousel|video|reel|story|text
  caption          text,
  media_urls       jsonb        NOT NULL DEFAULT '[]',
  asset_ids        jsonb,                             -- vínculo aos CreativeAssets
  status           varchar(20)  NOT NULL DEFAULT 'DRAFT', -- DRAFT|SCHEDULED|PUBLISHING|PUBLISHED|FAILED
  external_post_id varchar(100),
  permalink_url    text,
  scheduled_at     timestamptz,
  published_at     timestamptz,
  error_message    text,
  created_by       uuid,
  created_at       timestamptz  DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organic_post_tenant   ON campanhasmarketingdigital."OrganicPost" (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_organic_post_client   ON campanhasmarketingdigital."OrganicPost" (client_id);
CREATE INDEX IF NOT EXISTS idx_organic_post_schedule ON campanhasmarketingdigital."OrganicPost" (status, scheduled_at)
  WHERE status = 'SCHEDULED';

-- ── 2. Sidebar / permissões (mesmo padrão da FASE 9) ───────
-- 2.1 Feature
INSERT INTO public.system_features
  (name, description, category_id, url, is_active, slug, sort_order, icon, created_at, updated_at)
SELECT
  'Publicações Orgânicas',
  'Publica criativos organicamente na Página do Facebook e Instagram, separado do fluxo pago',
  30,
  '/admin/campanhas/publicacoes',
  true,
  'publicacoes-organicas',
  8,
  'Megaphone',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_features WHERE url = '/admin/campanhas/publicacoes'
);

-- 2.2 Permissions (read + create + execute)
INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
SELECT sf.id, 'read', 'Visualizar publicações orgânicas', false, NOW()
FROM public.system_features sf
WHERE sf.url = '/admin/campanhas/publicacoes'
  AND NOT EXISTS (SELECT 1 FROM public.permissions p WHERE p.feature_id = sf.id AND p.action = 'read');

INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
SELECT sf.id, 'create', 'Criar publicação orgânica', false, NOW()
FROM public.system_features sf
WHERE sf.url = '/admin/campanhas/publicacoes'
  AND NOT EXISTS (SELECT 1 FROM public.permissions p WHERE p.feature_id = sf.id AND p.action = 'create');

INSERT INTO public.permissions (feature_id, action, description, requires_2fa, created_at)
SELECT sf.id, 'execute', 'Publicar conteúdo orgânico no Meta', false, NOW()
FROM public.system_features sf
WHERE sf.url = '/admin/campanhas/publicacoes'
  AND NOT EXISTS (SELECT 1 FROM public.permissions p WHERE p.feature_id = sf.id AND p.action = 'execute');

-- 2.3 role_permissions — espelha as roles do desperdício
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT DISTINCT dp_rp.role_id, new_p.id
FROM public.permissions new_p
JOIN public.system_features new_sf ON new_sf.id = new_p.feature_id AND new_sf.url = '/admin/campanhas/publicacoes'
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

-- 2.4 tenant_feature_overrides — provisiona p/ todos os tenants que têm desperdício
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active, created_at, updated_at)
SELECT DISTINCT tfo_desp.tenant_id, new_sf.id, true, NOW(), NOW()
FROM public.tenant_feature_overrides tfo_desp
JOIN public.system_features desp_sf ON desp_sf.id = tfo_desp.feature_id AND desp_sf.url = '/admin/campanhas/desperdicio'
JOIN public.system_features new_sf  ON new_sf.url = '/admin/campanhas/publicacoes'
WHERE NOT EXISTS (
    SELECT 1 FROM public.tenant_feature_overrides x
    WHERE x.tenant_id = tfo_desp.tenant_id AND x.feature_id = new_sf.id
);

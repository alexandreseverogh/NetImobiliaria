-- ============================================================
-- FASE 1 — Multi-Network Foundation
-- Arquivo: prisma/migration-2026-05-fase1-multi-network.sql
-- Execução:
--   docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria \
--     < prisma/migration-2026-05-fase1-multi-network.sql
-- IDEMPOTENTE: pode ser re-executado sem efeitos colaterais
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. Catálogo de redes de anúncios
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ad_networks (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  code         VARCHAR(20)  UNIQUE NOT NULL,
  name         VARCHAR(100) NOT NULL,
  icon         VARCHAR(50),
  color        VARCHAR(20),
  api_base_url VARCHAR(255),
  is_active    BOOLEAN      NOT NULL DEFAULT true,
  capabilities JSONB        NOT NULL DEFAULT '{}',
  sort_order   INTEGER      NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Seeds das redes suportadas
INSERT INTO public.ad_networks (code, name, icon, color, api_base_url, capabilities, sort_order)
VALUES
  (
    'meta', 'Meta Ads', 'meta', '#1877f2',
    'https://graph.facebook.com/v21.0',
    '{
      "formats": ["IMAGE","VIDEO","CAROUSEL","COLLECTION","STORY"],
      "objectives": ["OUTCOME_TRAFFIC","OUTCOME_LEADS","OUTCOME_SALES","OUTCOME_AWARENESS","OUTCOME_ENGAGEMENT"],
      "targeting": ["interests","lookalike","custom_audience","geo","demographics","behaviors"],
      "supported": true
    }'::jsonb,
    1
  ),
  (
    'google', 'Google Ads', 'google', '#4285f4',
    'https://googleads.googleapis.com',
    '{
      "formats": ["TEXT","RESPONSIVE_SEARCH","RESPONSIVE_DISPLAY","SHOPPING","PMAX","VIDEO"],
      "objectives": ["SALES","LEADS","WEBSITE_TRAFFIC","BRAND_AWARENESS","APP_PROMOTION"],
      "targeting": ["keywords","audiences","topics","placements","remarketing"],
      "supported": false
    }'::jsonb,
    2
  ),
  (
    'linkedin', 'LinkedIn Ads', 'linkedin', '#0a66c2',
    'https://api.linkedin.com/v2',
    '{
      "formats": ["SINGLE_IMAGE","VIDEO","CAROUSEL","TEXT","SPOTLIGHT","CONVERSATION"],
      "objectives": ["BRAND_AWARENESS","WEBSITE_VISITS","ENGAGEMENT","VIDEO_VIEWS","LEAD_GENERATION","WEBSITE_CONVERSIONS","JOB_APPLICANTS"],
      "targeting": ["job_titles","companies","skills","seniority","industries","education"],
      "supported": false
    }'::jsonb,
    3
  ),
  (
    'tiktok', 'TikTok Ads', 'tiktok', '#000000',
    'https://business-api.tiktok.com/open_api/v1.3',
    '{
      "formats": ["VIDEO","TOPVIEW","BRANDED_HASHTAG","BRANDED_EFFECT","COLLECTION"],
      "objectives": ["REACH","TRAFFIC","VIDEO_VIEW","LEAD_GENERATION","CONVERSIONS","APP_INSTALL"],
      "targeting": ["hashtags","interests","similar_audience","geo","demographics","device"],
      "supported": false
    }'::jsonb,
    4
  )
ON CONFLICT (code) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 2. Credenciais por rede e por tenant
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_network_credentials (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  network_id     UUID         NOT NULL REFERENCES public.ad_networks(id),
  credentials    JSONB        NOT NULL DEFAULT '{}',
  account_id     VARCHAR(100),
  display_name   VARCHAR(150),
  is_active      BOOLEAN      NOT NULL DEFAULT true,
  expires_at     TIMESTAMPTZ,
  last_validated TIMESTAMPTZ,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, network_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_net_creds_tenant
  ON public.tenant_network_credentials (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_net_creds_network
  ON public.tenant_network_credentials (network_id);

-- ────────────────────────────────────────────────────────────
-- 3. Migrar credenciais Meta existentes dos tenants
--    (copia para tenant_network_credentials, mantém colunas legado)
-- ────────────────────────────────────────────────────────────
INSERT INTO public.tenant_network_credentials
  (tenant_id, network_id, credentials, account_id, display_name, expires_at, is_active)
SELECT
  t.id,
  n.id,
  jsonb_build_object(
    'access_token',  t.meta_token,
    'app_id',        t.meta_app_id,
    'app_secret',    t.meta_app_secret
  ),
  t.meta_ad_account_id,
  'Meta Ads (migrado)',
  t.meta_token_expires_at,
  true
FROM public.tenants t
JOIN public.ad_networks n ON n.code = 'meta'
WHERE t.meta_token IS NOT NULL
  AND t.meta_ad_account_id IS NOT NULL
ON CONFLICT (tenant_id, network_id) DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- 4. Adicionar colunas de rede em Campaign, AdSet, Ad
-- ────────────────────────────────────────────────────────────
ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN IF NOT EXISTS network_id       UUID REFERENCES public.ad_networks(id),
  ADD COLUMN IF NOT EXISTS external_id      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS network_metadata JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_campaign_network_id
  ON campanhasmarketingdigital."Campaign" (network_id);
CREATE INDEX IF NOT EXISTS idx_campaign_external_id
  ON campanhasmarketingdigital."Campaign" (external_id);

ALTER TABLE campanhasmarketingdigital."AdSet"
  ADD COLUMN IF NOT EXISTS external_id      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS network_metadata JSONB NOT NULL DEFAULT '{}';

ALTER TABLE campanhasmarketingdigital."Ad"
  ADD COLUMN IF NOT EXISTS external_id      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS network_metadata JSONB NOT NULL DEFAULT '{}';

-- ────────────────────────────────────────────────────────────
-- 5. Backfill: campanhas Meta existentes recebem network_id
--    e external_id (copia de metaCampaignId)
-- ────────────────────────────────────────────────────────────
UPDATE campanhasmarketingdigital."Campaign" c
SET
  network_id  = (SELECT id FROM public.ad_networks WHERE code = 'meta'),
  external_id = c."metaCampaignId"
WHERE c.network_id IS NULL
  AND c."metaCampaignId" IS NOT NULL;

UPDATE campanhasmarketingdigital."AdSet"
SET external_id = "metaAdSetId"
WHERE external_id IS NULL
  AND "metaAdSetId" IS NOT NULL;

UPDATE campanhasmarketingdigital."Ad"
SET external_id = "metaAdId"
WHERE external_id IS NULL
  AND "metaAdId" IS NOT NULL;

COMMIT;

-- ── Verificação pós-execução ──
SELECT 'FASE 1 — Verificação' AS fase;
SELECT 'ad_networks'                   AS tabela, count(*) AS rows FROM public.ad_networks;
SELECT 'tenant_network_credentials'    AS tabela, count(*) AS rows FROM public.tenant_network_credentials;
SELECT 'Campaigns com network_id'      AS tabela, count(*) AS rows
  FROM campanhasmarketingdigital."Campaign" WHERE network_id IS NOT NULL;
SELECT 'Campaigns sem network_id'      AS tabela, count(*) AS rows
  FROM campanhasmarketingdigital."Campaign" WHERE network_id IS NULL;

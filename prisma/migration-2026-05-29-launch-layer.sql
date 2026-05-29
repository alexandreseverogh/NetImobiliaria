-- ============================================================
-- REVISÃO 2026-05-29 — Camada de Lançamento de Campanhas
-- Arquivo: prisma/migration-2026-05-29-launch-layer.sql
-- Execução:
--   docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria \
--     < prisma/migration-2026-05-29-launch-layer.sql
-- IDEMPOTENTE: pode ser re-executado sem efeitos colaterais
-- Ref: docs/PLANO_ACAO_MESTRE_EVOLUCAO_PLATAFORMA.md seção 1.6
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. system_segments → ADD network_defaults JSONB
--    Curadoria 1× pelo Master, keyed por rede.
--    Resolve special_ad_category, objective, custom_event_type
--    automaticamente a partir do segmento do cliente/tenant.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.system_segments
  ADD COLUMN IF NOT EXISTS network_defaults JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.system_segments.network_defaults IS
  'Defaults de rede por segmento, keyed por código de rede (meta/google/youtube/linkedin/tiktok).
   Estrutura: {"meta": {"special_ad_categories": [...], "objective": "...", "custom_event_type": "...", "optimization_goal": "...", "billing_event": "..."}}
   Curadoria 1× pelo Master. Resolve campos automáticos no lançamento de campanha.';

-- ────────────────────────────────────────────────────────────
-- 2. tenants → ADD website TEXT
--    URL do site do próprio tenant (usado quando a campanha
--    é para o tenant em si, sem cliente associado).
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS website TEXT;

COMMENT ON COLUMN public.tenants.website IS
  'URL do site do tenant. Pré-preenche linkUrl no CampaignWizard quando não há cliente associado à campanha.';

-- ────────────────────────────────────────────────────────────
-- 3. clientes → ADD website TEXT
--    URL do site do cliente. Pré-preenche linkUrl na UI
--    de lançamento. WhatsApp SEMPRE vem do tenant.
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS website TEXT;

COMMENT ON COLUMN public.clientes.website IS
  'URL do site do cliente. Pré-preenche linkUrl no CampaignWizard. WhatsApp (CTA) sempre usa tenant.telefone.';

-- ────────────────────────────────────────────────────────────
-- 4. tenant_network_credentials.credentials
--    Sem ALTER TABLE — já é JSONB. Documentar as novas chaves
--    que devem estar presentes para Meta Ads:
--      access_token, app_id, app_secret  ← já existentes
--      page_id                           ← NOVO (Facebook Page ID)
--      instagram_actor_id                ← NOVO (opcional)
--      pixel_id                          ← NOVO (Meta Pixel ID)
--    A UI de Settings irá popular essas chaves via PUT.
-- ────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.tenant_network_credentials.credentials IS
  'JSONB com credenciais da rede. Para Meta: {access_token, app_id, app_secret, page_id, instagram_actor_id, pixel_id, ad_account_id}.
   page_id: obrigatório para criar criativos (object_story_spec.page_id).
   pixel_id: obrigatório para rastreamento de conversões (promoted_object).
   instagram_actor_id: opcional, para criativos no Instagram.';

-- ────────────────────────────────────────────────────────────
-- 5. Seeds — network_defaults para o segmento imobiliário
-- ────────────────────────────────────────────────────────────

-- Imobiliário: HOUSING exige special_ad_categories; objetivo padrão é captação de leads
UPDATE public.system_segments
SET network_defaults = '{
  "meta": {
    "special_ad_categories": ["HOUSING"],
    "objective": "OUTCOME_LEADS",
    "custom_event_type": "LEAD",
    "optimization_goal": "LEAD_GENERATION",
    "billing_event": "IMPRESSIONS",
    "promoted_object_type": "PIXEL_WITH_CONVERSION"
  },
  "google": {
    "campaign_type": "SEARCH",
    "bidding_strategy": "TARGET_CPA",
    "conversion_action_type": "WEBPAGE"
  },
  "youtube": {
    "campaign_type": "VIDEO",
    "video_ad_format": "INSTREAM_NOT_SKIPPABLE",
    "conversion_action_type": "WEBPAGE"
  },
  "linkedin": {
    "objective": "LEAD_GENERATION",
    "format": "SINGLE_IMAGE"
  },
  "tiktok": {
    "objective": "LEAD_GENERATION",
    "placement": "TIKTOK"
  }
}'::jsonb
WHERE slug = 'imobiliario'
  AND (network_defaults = '{}' OR network_defaults IS NULL);

-- ────────────────────────────────────────────────────────────
-- 6. Seeds — network_defaults para outros segmentos comuns
--    (será expandido conforme novos segmentos forem criados)
-- ────────────────────────────────────────────────────────────

-- Automotivo: sem special_ad_categories; objetivo padrão é leads
UPDATE public.system_segments
SET network_defaults = '{
  "meta": {
    "special_ad_categories": [],
    "objective": "OUTCOME_LEADS",
    "custom_event_type": "LEAD",
    "optimization_goal": "LEAD_GENERATION",
    "billing_event": "IMPRESSIONS",
    "promoted_object_type": "PIXEL_WITH_CONVERSION"
  }
}'::jsonb
WHERE slug IN ('automotivo', 'automoveis', 'concessionaria')
  AND (network_defaults = '{}' OR network_defaults IS NULL);

-- Varejo/E-commerce: objetivo padrão é vendas
UPDATE public.system_segments
SET network_defaults = '{
  "meta": {
    "special_ad_categories": [],
    "objective": "OUTCOME_SALES",
    "custom_event_type": "PURCHASE",
    "optimization_goal": "OFFSITE_CONVERSIONS",
    "billing_event": "IMPRESSIONS",
    "promoted_object_type": "PIXEL_WITH_CONVERSION"
  }
}'::jsonb
WHERE slug IN ('varejo', 'ecommerce', 'e-commerce', 'loja')
  AND (network_defaults = '{}' OR network_defaults IS NULL);

-- Serviços / genérico: objetivo leads, sem categorias especiais
UPDATE public.system_segments
SET network_defaults = '{
  "meta": {
    "special_ad_categories": [],
    "objective": "OUTCOME_LEADS",
    "custom_event_type": "LEAD",
    "optimization_goal": "LEAD_GENERATION",
    "billing_event": "IMPRESSIONS",
    "promoted_object_type": "PIXEL_WITH_CONVERSION"
  }
}'::jsonb
WHERE slug IN ('servicos', 'services', 'saude', 'educacao', 'beleza', 'marketing-digital')
  AND (network_defaults = '{}' OR network_defaults IS NULL);

-- ────────────────────────────────────────────────────────────
-- 7. Índice para busca por network_defaults
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_system_segments_network_defaults
  ON public.system_segments USING gin (network_defaults);

COMMIT;

-- ── Verificação pós-execução ──────────────────────────────────
SELECT '=== VERIFICAÇÃO migration-2026-05-29-launch-layer ===' AS info;

SELECT
  'system_segments.network_defaults' AS coluna,
  COUNT(*) FILTER (WHERE network_defaults != '{}') AS com_defaults,
  COUNT(*) AS total
FROM public.system_segments;

SELECT
  slug,
  network_defaults->'meta'->>'objective' AS meta_objective,
  network_defaults->'meta'->>'special_ad_categories' AS meta_special_ad
FROM public.system_segments
WHERE network_defaults != '{}'
ORDER BY slug;

SELECT
  'tenants.website exists' AS check,
  COUNT(*) AS total_tenants,
  COUNT(website) AS com_website
FROM public.tenants;

SELECT
  'clientes.website exists' AS check,
  COUNT(*) AS total_clientes,
  COUNT(website) AS com_website
FROM public.clientes;

SELECT '=== FIM DA VERIFICAÇÃO ===' AS info;

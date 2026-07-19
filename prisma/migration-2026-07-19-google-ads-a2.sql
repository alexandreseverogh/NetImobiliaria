-- FASE 1 (Google Ads) — A2: modelo de dados
-- Ver docs/PLANO_GOOGLE_TIKTOK.md
--
-- A2.1 — 4 colunas novas em Insight (grão campanha-dia)
ALTER TABLE campanhasmarketingdigital."Insight"
  ADD COLUMN IF NOT EXISTS search_impression_share FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS search_budget_lost_is    FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS search_rank_lost_is      FLOAT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversions_value        FLOAT NOT NULL DEFAULT 0;

-- A2.2 — GoogleSearchTerm (grão: termo de busca — não cabe em Insight)
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."GoogleSearchTerm" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  campaign_id TEXT NOT NULL,
  ad_network VARCHAR(20) NOT NULL DEFAULT 'google',

  search_term VARCHAR(255) NOT NULL,
  match_type VARCHAR(20) NOT NULL,  -- BROAD, PHRASE, EXACT

  date DATE NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  cost FLOAT NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,

  status VARCHAR(20) NOT NULL DEFAULT 'none',  -- 'none' | 'negated' | 'added_as_keyword'

  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, campaign_id, search_term, date)
);
CREATE INDEX IF NOT EXISTS idx_google_search_term_campaign_date
  ON campanhasmarketingdigital."GoogleSearchTerm" (campaign_id, date);
CREATE INDEX IF NOT EXISTS idx_google_search_term_status
  ON campanhasmarketingdigital."GoogleSearchTerm" (status) WHERE status != 'none';
CREATE INDEX IF NOT EXISTS idx_google_search_term_tenant
  ON campanhasmarketingdigital."GoogleSearchTerm" (tenant_id);

-- A2.3 — GoogleNegativeKeyword (memória do que já foi negativado — evita duplicar proposta)
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."GoogleNegativeKeyword" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  campaign_id TEXT NOT NULL,

  term VARCHAR(255) NOT NULL,
  match_type VARCHAR(20) NOT NULL,
  added_by VARCHAR(20) NOT NULL,  -- 'agent' | 'human'
  added_at TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE(tenant_id, campaign_id, term)
);
CREATE INDEX IF NOT EXISTS idx_google_negative_keyword_campaign
  ON campanhasmarketingdigital."GoogleNegativeKeyword" (campaign_id);

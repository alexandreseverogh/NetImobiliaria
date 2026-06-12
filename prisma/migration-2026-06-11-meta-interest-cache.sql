-- FASE 18.5 — Cache de interesses Meta resolvidos
-- Migration: 2026-06-11
-- Evita rechamadas ao endpoint adinterest (rate-limit). IDs de interesse do Meta
-- são globais e estáveis → cache compartilhado por termo de busca.

CREATE TABLE IF NOT EXISTS campanhasmarketingdigital.meta_interest_cache (
  id          BIGSERIAL PRIMARY KEY,
  query_term  VARCHAR(200) NOT NULL,   -- termo normalizado (trim + lower)
  geo         VARCHAR(10)  NOT NULL DEFAULT 'BR',
  locale      VARCHAR(10)  NOT NULL DEFAULT 'pt_BR',
  results     JSONB        NOT NULL,    -- [{id,name,audienceLower,audienceUpper,path}]
  fetched_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (query_term, geo, locale)
);

CREATE INDEX IF NOT EXISTS idx_meta_interest_cache_term
  ON campanhasmarketingdigital.meta_interest_cache (query_term, geo, locale);

COMMENT ON TABLE campanhasmarketingdigital.meta_interest_cache IS
  'Cache de buscas de interesse na Meta API (IDs globais e estáveis). Reduz rate-limit.';

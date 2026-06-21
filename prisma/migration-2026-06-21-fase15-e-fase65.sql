-- ============================================================
-- FASE 15 (complemento) + FASE 6.5
-- Data: 2026-06-21
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- FASE 15 — AgentHeartbeat (idempotente — migration base já
--           criou a tabela em 2026-06-03; este bloco só
--           garante que colunas novas existam se necessário)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."AgentHeartbeat" (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID,
  triggered_by     VARCHAR(50) NOT NULL DEFAULT 'cron',
  cycle_at         TIMESTAMP   NOT NULL DEFAULT NOW(),
  duration_ms      INTEGER,
  campaigns_synced INTEGER     NOT NULL DEFAULT 0,
  actions_created  INTEGER     NOT NULL DEFAULT 0,
  success          BOOLEAN     NOT NULL DEFAULT true,
  error_message    TEXT
);

CREATE INDEX IF NOT EXISTS idx_agent_heartbeat_recent
  ON campanhasmarketingdigital."AgentHeartbeat" (cycle_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_heartbeat_tenant
  ON campanhasmarketingdigital."AgentHeartbeat" (tenant_id, cycle_at DESC);

-- ────────────────────────────────────────────────────────────
-- FASE 6.5 — CreativeTemplate
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."CreativeTemplate" (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID,                             -- NULL = template global
  name       TEXT        NOT NULL,
  style      TEXT        NOT NULL DEFAULT 'corporate',  -- 'ugc' | 'corporate'
  layout     JSONB       NOT NULL DEFAULT '{}',
  formats    TEXT[]      NOT NULL DEFAULT '{}',
  is_active  BOOLEAN     NOT NULL DEFAULT true,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_template_tenant
  ON campanhasmarketingdigital."CreativeTemplate" (tenant_id);

-- ────────────────────────────────────────────────────────────
-- FASE 6.5 — CreativeGenerationJob
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."CreativeGenerationJob" (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID        NOT NULL,
  source_asset_id  TEXT        NOT NULL,  -- CreativeAsset.id
  template_id      UUID        REFERENCES campanhasmarketingdigital."CreativeTemplate"(id) ON DELETE SET NULL,
  concept          JSONB,                 -- { headline, body, cta }
  formats          TEXT[]      NOT NULL DEFAULT '{}',
  status           TEXT        NOT NULL DEFAULT 'PENDING',
  output_urls      TEXT[]      NOT NULL DEFAULT '{}',
  cost_cents       INTEGER     NOT NULL DEFAULT 0,
  error_message    TEXT,
  created_by       UUID,
  reviewed_by      UUID,
  reviewed_at      TIMESTAMP,
  created_at       TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_gen_job_tenant
  ON campanhasmarketingdigital."CreativeGenerationJob" (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_creative_gen_job_asset
  ON campanhasmarketingdigital."CreativeGenerationJob" (source_asset_id);

-- ────────────────────────────────────────────────────────────
-- FASE 6.5 — Estender CreativeAsset com rastreabilidade
-- ────────────────────────────────────────────────────────────
ALTER TABLE campanhasmarketingdigital."CreativeAsset"
  ADD COLUMN IF NOT EXISTS derived_from_asset_id TEXT,
  ADD COLUMN IF NOT EXISTS ai_generated          BOOLEAN NOT NULL DEFAULT false;

-- ────────────────────────────────────────────────────────────
-- FASE 6.5 — Templates globais seed (3 layouts básicos)
-- ────────────────────────────────────────────────────────────
INSERT INTO campanhasmarketingdigital."CreativeTemplate"
  (id, tenant_id, name, style, layout, formats, is_active)
VALUES
  (
    gen_random_uuid(), NULL,
    'Feed Corporativo',
    'corporate',
    '{
      "bgOpacity": 0.45,
      "headlineFontSize": 48,
      "headlineColor": "#FFFFFF",
      "headlineShadow": true,
      "ctaBg": "#1877F2",
      "ctaColor": "#FFFFFF",
      "ctaFontSize": 22,
      "logoPosition": "top-right",
      "logoSize": 80,
      "padding": 40
    }',
    ARRAY['1:1','4:5'],
    true
  ),
  (
    gen_random_uuid(), NULL,
    'Story / Reel UGC',
    'ugc',
    '{
      "bgOpacity": 0.35,
      "headlineFontSize": 52,
      "headlineColor": "#FFFFFF",
      "headlineShadow": true,
      "ctaBg": "#FF6B35",
      "ctaColor": "#FFFFFF",
      "ctaFontSize": 24,
      "logoPosition": "top-left",
      "logoSize": 70,
      "padding": 48
    }',
    ARRAY['9:16'],
    true
  ),
  (
    gen_random_uuid(), NULL,
    'Carrossel Minimalista',
    'corporate',
    '{
      "bgOpacity": 0.55,
      "headlineFontSize": 44,
      "headlineColor": "#FFFFFF",
      "headlineShadow": false,
      "ctaBg": "#10B981",
      "ctaColor": "#FFFFFF",
      "ctaFontSize": 20,
      "logoPosition": "bottom-right",
      "logoSize": 72,
      "padding": 36
    }',
    ARRAY['1:1','4:5','9:16'],
    true
  )
ON CONFLICT DO NOTHING;

-- ────────────────────────────────────────────────────────────
-- Verificação
-- ────────────────────────────────────────────────────────────
SELECT 'AgentHeartbeat' AS tabela, COUNT(*) AS rows FROM campanhasmarketingdigital."AgentHeartbeat"
UNION ALL
SELECT 'CreativeTemplate',         COUNT(*) FROM campanhasmarketingdigital."CreativeTemplate"
UNION ALL
SELECT 'CreativeGenerationJob',    COUNT(*) FROM campanhasmarketingdigital."CreativeGenerationJob";

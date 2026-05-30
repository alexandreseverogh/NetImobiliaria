-- ============================================================
-- FASE 4 — Campaign State Machine
-- Lifecycle status (8 estados) + histórico de transições
-- ============================================================

-- 1. Colunas lifecycle na tabela Campaign
ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN IF NOT EXISTS lifecycle_status     VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN IF NOT EXISTS lifecycle_changed_at TIMESTAMP DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS learning_started_at  TIMESTAMP,
  ADD COLUMN IF NOT EXISTS stable_since         TIMESTAMP;

-- 2. Índice de busca rápida por lifecycle + tenant
CREATE INDEX IF NOT EXISTS idx_campaign_lifecycle
  ON campanhasmarketingdigital."Campaign"(lifecycle_status, tenant_id);

-- 3. Backfill: campanhas existentes
UPDATE campanhasmarketingdigital."Campaign"
SET lifecycle_status = CASE
  WHEN status = 'ACTIVE'  THEN 'STABLE'
  WHEN status = 'PAUSED'  THEN 'PAUSED'
  ELSE 'DRAFT'
END
WHERE lifecycle_status = 'DRAFT';

-- 4. Tabela de histórico de transições
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."CampaignLifecycleEvent" (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      TEXT NOT NULL
    REFERENCES campanhasmarketingdigital."Campaign"(id) ON DELETE CASCADE,
  tenant_id        UUID,
  from_status      VARCHAR(20),
  to_status        VARCHAR(20) NOT NULL,
  trigger_source   VARCHAR(20) NOT NULL,  -- AGENT | MANUAL | SYNC | CRON
  reason           TEXT,
  metrics_snapshot JSONB,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_event
  ON campanhasmarketingdigital."CampaignLifecycleEvent"(campaign_id, created_at DESC);

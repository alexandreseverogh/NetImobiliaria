-- =============================================================================
-- FASE 8 — Tracking Health Monitor
-- Data: 2026-06-01
-- Descrição: monitoramento automatizado da saúde do tracking (pixel, leads,
--            duplicatas, órfãos). Score 0-100 com histórico persistido.
-- =============================================================================

-- 1. Tabela de resultados de health check
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."TrackingHealthCheck" (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL,
  client_id     UUID,
  overall_score INTEGER NOT NULL,  -- 0-100
  checks        JSONB NOT NULL,    -- array de checks individuais com status/valor
  issues        JSONB NOT NULL,    -- array de problemas encontrados (gravidade + mensagem)
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 2. Índice principal: busca os mais recentes por tenant
CREATE INDEX IF NOT EXISTS idx_tracking_health_tenant
  ON campanhasmarketingdigital."TrackingHealthCheck" (tenant_id, created_at DESC);

-- 3. Índice parcial: health crítico (score <= 50) para alertas rápidos
CREATE INDEX IF NOT EXISTS idx_tracking_health_critical
  ON campanhasmarketingdigital."TrackingHealthCheck" (tenant_id, overall_score, created_at DESC)
  WHERE overall_score <= 50;

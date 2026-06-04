-- FASE 15 — Agentes: Garantia de Execução + Expansão de Ações
-- Migration: 2026-06-03
-- Tabela agent_heartbeat + benchmark agent_confidence_min

-- ────────────────────────────────────────────────────────────
-- 1. AgentHeartbeat — registro de cada ciclo do agente
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."AgentHeartbeat" (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID,                                        -- NULL = ciclo global
  triggered_by     VARCHAR(50) NOT NULL DEFAULT 'cron',         -- 'cron' | 'manual' | 'api'
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
-- 2. Benchmark agent_confidence_min (por segmento)
--    Limiar de confiança mínimo para execução de ações do agente.
--    Padrão = 0.85; cada tenant pode fazer override via tenant_benchmark_overrides.
-- ────────────────────────────────────────────────────────────
INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
SELECT
  s.id,
  'agent_confidence_min',
  'Confiança Mínima do Agente',
  0.85,
  'ratio',
  'Threshold de confiança (0–1) para execução automática de ações defensivas do agente'
FROM public.system_segments s
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_benchmarks sb
  WHERE sb.segment_id = s.id AND sb.metric_key = 'agent_confidence_min'
);

-- ────────────────────────────────────────────────────────────
-- 3. Verificação
-- ────────────────────────────────────────────────────────────
SELECT 'AgentHeartbeat criada' AS status,
       COUNT(*) AS rows
FROM campanhasmarketingdigital."AgentHeartbeat";

SELECT 'agent_confidence_min seeds' AS status,
       COUNT(*) AS rows
FROM public.system_benchmarks
WHERE metric_key = 'agent_confidence_min';

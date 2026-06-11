-- FASE 18.2 — Briefing Estratégico por segmento
-- Migration: 2026-06-11 (parte D)
-- Adiciona segment_id / segment_name ao StrategicBriefing para persistir
-- um briefing por segmento. Aplicar apenas localmente.

ALTER TABLE campanhasmarketingdigital."StrategicBriefing"
  ADD COLUMN IF NOT EXISTS segment_id   UUID,
  ADD COLUMN IF NOT EXISTS segment_name VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_strategic_briefing_segment
  ON campanhasmarketingdigital."StrategicBriefing" (tenant_id, segment_id, "createdAt" DESC);

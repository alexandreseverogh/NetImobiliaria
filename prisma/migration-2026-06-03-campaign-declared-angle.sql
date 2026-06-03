-- FASE 14 — Ângulo Estratégico no Ciclo Completo
-- Adiciona o ângulo de comunicação DECLARADO no lançamento da campanha.
-- Taxonomia idêntica à inferida pelo Vision (CreativeAnalysis.angle) para permitir
-- comparação declarado × inferido na calibração.
-- Idempotente, nullable, retrocompatível (campanhas legadas continuam válidas).

ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN IF NOT EXISTS declared_angle VARCHAR(50) NULL;

-- Índice para agregação por ângulo (tenant + ângulo)
CREATE INDEX IF NOT EXISTS idx_campaign_declared_angle
  ON campanhasmarketingdigital."Campaign" (tenant_id, declared_angle);

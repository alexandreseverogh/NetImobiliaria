-- Migration: colunas faltantes em AgentAction (title, description, status, executedAt)
-- Adicionado 2026-06-24 — coluna was missing after FASE 15 refactor

ALTER TABLE campanhasmarketingdigital."AgentAction"
  ADD COLUMN IF NOT EXISTS title        TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS description  TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'PENDING_APPROVAL',
  ADD COLUMN IF NOT EXISTS "executedAt" TIMESTAMPTZ;

-- Remover defaults temporários (os novos registros serão inseridos com valores reais)
ALTER TABLE campanhasmarketingdigital."AgentAction"
  ALTER COLUMN title       DROP DEFAULT,
  ALTER COLUMN description DROP DEFAULT;

COMMENT ON COLUMN campanhasmarketingdigital."AgentAction".title IS 'Título legível da ação gerada pelo agente';
COMMENT ON COLUMN campanhasmarketingdigital."AgentAction".description IS 'Descrição detalhada enriquecida pelo LLM';
COMMENT ON COLUMN campanhasmarketingdigital."AgentAction".status IS 'PENDING_APPROVAL | PENDING_EXECUTION | EXECUTED | FAILED | REJECTED | NOTIFIED';
COMMENT ON COLUMN campanhasmarketingdigital."AgentAction"."executedAt" IS 'Timestamp da execução efetiva da ação';

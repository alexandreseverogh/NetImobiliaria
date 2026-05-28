-- ============================================================
-- MIGRAÇÃO: Centralização LLM das Campanhas (2026-05-28)
-- Garante 1 linha global na tabela Settings (tenant_id IS NULL)
-- ============================================================

-- Índice parcial único: permite apenas 1 linha com tenant_id IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS settings_global_row_idx
  ON campanhasmarketingdigital."Settings" ((tenant_id IS NULL))
  WHERE tenant_id IS NULL;

-- Seed da linha global (caso ainda não exista)
INSERT INTO campanhasmarketingdigital."Settings"
  (id, tenant_id, "llmProvider", "llmModel", "llmApiKey")
VALUES
  (gen_random_uuid(), NULL, 'anthropic', 'claude-sonnet-4-6', '')
ON CONFLICT DO NOTHING;

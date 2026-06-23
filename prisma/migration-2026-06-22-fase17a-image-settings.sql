-- FASE 17-A — Configuração de provider de geração de imagens por IA
-- Migration: 2026-06-22

ALTER TABLE campanhasmarketingdigital."Settings"
  ADD COLUMN IF NOT EXISTS "imageProvider" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "imageModel"    VARCHAR(150),
  ADD COLUMN IF NOT EXISTS "imageApiKey"   TEXT;

-- Verificação
SELECT
  tenant_id,
  "llmProvider", "llmModel",
  "imageProvider", "imageModel",
  CASE WHEN "imageApiKey" IS NOT NULL THEN 'set' ELSE 'null' END AS image_key_status
FROM campanhasmarketingdigital."Settings"
WHERE tenant_id IS NULL
ORDER BY id LIMIT 1;

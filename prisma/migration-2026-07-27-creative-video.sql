-- ============================================================
-- Criativos em vídeo — Fase 1 (armazenamento e metadados)
-- Reaproveita CreativeAsset (format = 'video') em vez de criar outra tabela.
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.
-- Aditiva: nenhuma coluna existente é alterada.
-- ============================================================

BEGIN;

ALTER TABLE campanhasmarketingdigital."CreativeAsset"
  ADD COLUMN IF NOT EXISTS duration_seconds NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS meta_video_id    VARCHAR(64),
  ADD COLUMN IF NOT EXISTS upload_status    VARCHAR(20) NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS upload_id        TEXT;

-- Itens já existentes são imagens prontas: 'ready' (default acima) é o estado correto.

CREATE INDEX IF NOT EXISTS idx_creative_asset_tenant_format
  ON campanhasmarketingdigital."CreativeAsset" (tenant_id, format);

COMMIT;

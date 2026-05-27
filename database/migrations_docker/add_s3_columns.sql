-- ============================================================
-- Migration: Adicionar colunas de suporte a Object Storage (S3/MinIO)
-- ============================================================
-- GUARDIAN RULES: ✅ Operação aditiva, sem remoção de colunas
-- Rollback: DROP das colunas adicionadas
-- ============================================================

-- Coluna para indicar onde a imagem está armazenada
ALTER TABLE imovel_imagens
  ADD COLUMN IF NOT EXISTS storage_type VARCHAR(20) DEFAULT 'database';

-- Caminho da imagem no bucket S3/MinIO
ALTER TABLE imovel_imagens
  ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500);

-- URL final (CDN ou endpoint direto)
ALTER TABLE imovel_imagens
  ADD COLUMN IF NOT EXISTS url_cdn VARCHAR(500);

-- Flag se a imagem já foi otimizada (WebP/resize)
ALTER TABLE imovel_imagens
  ADD COLUMN IF NOT EXISTS processada BOOLEAN DEFAULT false;

-- Índice para buscar rapidamente imagens por tipo de storage
-- (usado pelo robô de migração para encontrar imagens ainda no banco)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imovel_imagens_storage_type
  ON imovel_imagens(storage_type)
  WHERE storage_type = 'database';

-- Índice para buscar imagens S3 rapidamente (usado pela API de streaming)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_imovel_imagens_s3
  ON imovel_imagens(id, storage_type, s3_key)
  WHERE storage_type = 's3';

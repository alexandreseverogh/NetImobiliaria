-- Reusa o mesmo padrão já usado em imovel_imagens (dual-writer S3/MinIO + fallback bytea):
-- storage_type indica onde a foto realmente mora ('s3' ou 'database'); s3_key/url_cdn só têm
-- valor quando storage_type='s3'. Fotos já existentes (bytea, sem essas colunas) continuam
-- servidas normalmente pelo fallback — sem migração de dado, mesmo comportamento já adotado
-- pra imóveis.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS storage_type VARCHAR(20) DEFAULT 'database',
  ADD COLUMN IF NOT EXISTS s3_key VARCHAR(500),
  ADD COLUMN IF NOT EXISTS url_cdn VARCHAR(500);

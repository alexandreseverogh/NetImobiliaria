-- Player de vídeo pro criativo na aba "Criativos" do dashboard (/admin/campanhas/dashboard).
--
-- Até agora nenhum lugar guardava a URL REAL do arquivo de vídeo de um anúncio — só a
-- miniatura (thumbnail), em `images`/`thumbnails`. Pra campanha lançada pelo próprio wizard,
-- o vídeo já existe permanentemente no nosso storage (CreativeAsset.storage_url) desde o
-- upload, mas nunca era copiado pro Ad depois de criado; pra campanha importada direto da Meta,
-- o vídeo nunca tinha sido baixado — só a miniatura.
--
-- Aditiva e idempotente: nenhuma coluna existente é tocada.
ALTER TABLE campanhasmarketingdigital."Ad"
  ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

-- Backfill: anúncio de vídeo lançado pelo próprio wizard ANTES desta correção já tem o
-- arquivo real guardado permanentemente no nosso storage (CreativeAsset.storage_url, vinculado
-- via ad_id na própria criação) — só nunca tinha sido copiado pro Ad. Idempotente (WHERE
-- "videoUrl" IS NULL) e nunca sobrescreve um valor já preenchido por outro caminho.
UPDATE campanhasmarketingdigital."Ad" a
   SET "videoUrl" = ca.storage_url
  FROM campanhasmarketingdigital."CreativeAsset" ca
 WHERE ca.ad_id = a.id
   AND ca.format = 'video'
   AND a."videoUrl" IS NULL
   AND a."creativeType" = 'VIDEO';

-- ============================================
-- Migration: Adicionar coluna idioma em feed_fontes
-- Data: 2025-01-XX
-- Descrição: Adiciona campo para armazenar idioma da fonte (pt, en, es, etc.)
-- ============================================

-- Adicionar coluna idioma na tabela feed_fontes
ALTER TABLE feed.feed_fontes 
ADD COLUMN IF NOT EXISTS idioma VARCHAR(10) DEFAULT 'pt';

-- Atualizar fontes existentes baseado no nome/URL (heurística)
UPDATE feed.feed_fontes 
SET idioma = 'en' 
WHERE url_feed LIKE '%reuters%' 
   OR url_feed LIKE '%bloomberg%' 
   OR url_feed LIKE '%wsj%' 
   OR url_feed LIKE '%forbes%' 
   OR url_feed LIKE '%archdaily%' 
   OR url_feed LIKE '%dezeen%' 
   OR url_feed LIKE '%proptechnews%' 
   OR url_feed LIKE '%realestatetechnews%' 
   OR url_feed LIKE '%cointelegraph.com/rss%' -- Internacional, não .br
   OR nome LIKE '%Reuters%' 
   OR nome LIKE '%Bloomberg%' 
   OR nome LIKE '%Wall Street%' 
   OR nome LIKE '%Forbes%' 
   OR nome LIKE '%ArchDaily%' 
   OR nome LIKE '%Dezeen%' 
   OR nome LIKE '%PropTech%' 
   OR nome LIKE '%Real Estate Tech%';

-- Garantir que fontes brasileiras estão como 'pt'
UPDATE feed.feed_fontes 
SET idioma = 'pt' 
WHERE url_feed LIKE '%.br%' 
   OR url_feed LIKE '%globo%' 
   OR url_feed LIKE '%infomoney%' 
   OR url_feed LIKE '%exame%' 
   OR url_feed LIKE '%br.cointelegraph%'
   OR nome LIKE '%Brasil%';

-- Comentário na coluna
COMMENT ON COLUMN feed.feed_fontes.idioma IS 'Idioma da fonte (pt, en, es, etc.) - usado para tradução automática';


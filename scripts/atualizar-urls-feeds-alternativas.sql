-- ============================================
-- Script: Atualizar URLs de Feeds com Alternativas
-- ============================================
-- 
-- URLs alternativas para feeds que estão com erro
-- Baseado em pesquisa de URLs RSS válidas
--
-- ============================================

BEGIN;

-- ============================================
-- APARTMENT THERAPY
-- ============================================
-- URL atual pode estar incorreta, tentar alternativas
UPDATE feed.feed_fontes 
SET url_feed = CASE 
    WHEN url_feed = 'https://www.apartmenttherapy.com/rss.xml' THEN 'https://www.apartmenttherapy.com/feed'
    ELSE 'https://www.apartmenttherapy.com/feed'
END,
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Apartment Therapy%';

-- ============================================
-- ARCHITECTURAL DIGEST
-- ============================================
-- Tentar diferentes formatos de URL
UPDATE feed.feed_fontes 
SET url_feed = CASE 
    WHEN url_feed LIKE '%architecturaldigest.com%' THEN 'https://www.architecturaldigest.com/feed/rss'
    ELSE 'https://www.architecturaldigest.com/feed/rss'
END,
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Architectural Digest%';

-- ============================================
-- BLOOMBERG REAL ESTATE
-- ============================================
-- Bloomberg pode ter mudado a estrutura do feed
UPDATE feed.feed_fontes 
SET url_feed = 'https://www.bloomberg.com/feeds/real-estate.rss',
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Bloomberg Real Estate%';

-- Se a URL acima não funcionar, tentar buscar via API ou feed geral
-- Nota: Bloomberg pode exigir autenticação ou ter mudado o feed

-- ============================================
-- REUTERS REAL ESTATE
-- ============================================
-- Reuters pode ter mudado a estrutura
UPDATE feed.feed_fontes 
SET url_feed = 'https://www.reuters.com/rssFeed/realEstate',
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Reuters Real Estate%';

-- Alternativa: usar feed geral do Reuters e filtrar por tags
-- UPDATE feed.feed_fontes 
-- SET url_feed = 'https://www.reuters.com/rssFeed/worldNews',
--     status_coleta = 'OK',
--     msg_erro = NULL
-- WHERE nome LIKE '%Reuters Real Estate%';

-- ============================================
-- WALL STREET JOURNAL REAL ESTATE
-- ============================================
-- WSJ pode ter mudado a URL do feed
UPDATE feed.feed_fontes 
SET url_feed = 'https://feeds.a.dj.com/rss/RSSRealEstate.xml',
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Wall Street Journal%';

-- Alternativa: tentar feed geral do WSJ
-- UPDATE feed.feed_fontes 
-- SET url_feed = 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
--     status_coleta = 'OK',
--     msg_erro = NULL
-- WHERE nome LIKE '%Wall Street Journal%';

-- ============================================
-- REAL ESTATE TECH NEWS
-- ============================================
-- Verificar se o site ainda existe e tem feed
UPDATE feed.feed_fontes 
SET url_feed = 'https://www.realestatetechnews.com/feed/',
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Real Estate Tech News%';

-- Se não funcionar, pode ser que o site tenha mudado de domínio ou fechado

-- ============================================
-- THE VERGE SMART HOME
-- ============================================
-- The Verge pode ter mudado a estrutura do feed
UPDATE feed.feed_fontes 
SET url_feed = 'https://www.theverge.com/smart-home/rss/index.xml',
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%The Verge Smart Home%';

-- Alternativa: usar feed geral do The Verge
-- UPDATE feed.feed_fontes 
-- SET url_feed = 'https://www.theverge.com/rss/index.xml',
--     status_coleta = 'OK',
--     msg_erro = NULL
-- WHERE nome LIKE '%The Verge Smart Home%';

COMMIT;

-- ============================================
-- VERIFICAR RESULTADOS
-- ============================================

SELECT 
    nome,
    url_feed,
    ativo,
    status_coleta,
    msg_erro
FROM feed.feed_fontes
WHERE nome IN (
    'Apartment Therapy',
    'Architectural Digest',
    'Bloomberg Real Estate',
    'Reuters Real Estate',
    'Wall Street Journal Real Estate',
    'Real Estate Tech News',
    'The Verge Smart Home'
)
ORDER BY nome;


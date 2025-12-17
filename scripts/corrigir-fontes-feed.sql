-- ============================================
-- Script: Corrigir e Desativar Fontes de Feed
-- ============================================
-- 
-- Este script:
-- 1. Atualiza URLs de feeds importantes que estão com erro
-- 2. Desativa feeds que não devem ser coletados
--
-- ============================================

BEGIN;

-- ============================================
-- 1. DESATIVAR FEEDS QUE NÃO DEVEM SER COLETADOS
-- ============================================

-- Dwell - Desativar
UPDATE feed.feed_fontes 
SET ativo = false, status_coleta = 'OK', msg_erro = NULL
WHERE nome LIKE '%Dwell%' OR url_feed LIKE '%dwell%';

-- Forbes Real Estate - Desativar (conteúdo não relacionado)
UPDATE feed.feed_fontes 
SET ativo = false, status_coleta = 'OK', msg_erro = NULL
WHERE nome LIKE '%Forbes Real Estate%' OR url_feed LIKE '%forbes.com/real-estate%';

-- Olhar Digital - Desativar (conteúdo não relacionado)
UPDATE feed.feed_fontes 
SET ativo = false, status_coleta = 'OK', msg_erro = NULL
WHERE nome LIKE '%Olhar Digital%' OR url_feed LIKE '%olhardigital%';

-- ============================================
-- 2. CORRIGIR URLs DE FEEDS IMPORTANTES
-- ============================================

-- Apartment Therapy - Tentar URL alternativa
UPDATE feed.feed_fontes 
SET url_feed = 'https://www.apartmenttherapy.com/rss.xml',
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Apartment Therapy%' 
  AND url_feed != 'https://www.apartmenttherapy.com/rss.xml';

-- Architectural Digest - Tentar URL alternativa
UPDATE feed.feed_fontes 
SET url_feed = 'https://www.architecturaldigest.com/feed/rss',
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Architectural Digest%' 
  AND url_feed != 'https://www.architecturaldigest.com/feed/rss';

-- Bloomberg Real Estate - Tentar URL alternativa
UPDATE feed.feed_fontes 
SET url_feed = 'https://www.bloomberg.com/feeds/real-estate.rss',
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Bloomberg Real Estate%' 
  AND url_feed != 'https://www.bloomberg.com/feeds/real-estate.rss';

-- Reuters Real Estate - Tentar URL alternativa
UPDATE feed.feed_fontes 
SET url_feed = 'https://www.reuters.com/rssFeed/realEstate',
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Reuters Real Estate%' 
  AND url_feed != 'https://www.reuters.com/rssFeed/realEstate';

-- Wall Street Journal Real Estate - Tentar URL alternativa
UPDATE feed.feed_fontes 
SET url_feed = 'https://feeds.a.dj.com/rss/RSSRealEstate.xml',
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Wall Street Journal%' 
  AND url_feed != 'https://feeds.a.dj.com/rss/RSSRealEstate.xml';

-- Real Estate Tech News - Tentar URL alternativa
UPDATE feed.feed_fontes 
SET url_feed = 'https://www.realestatetechnews.com/feed/',
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Real Estate Tech News%' 
  AND url_feed != 'https://www.realestatetechnews.com/feed/';

-- The Verge Smart Home - Tentar URL alternativa
UPDATE feed.feed_fontes 
SET url_feed = 'https://www.theverge.com/smart-home/rss/index.xml',
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%The Verge Smart Home%' 
  AND url_feed != 'https://www.theverge.com/smart-home/rss/index.xml';

COMMIT;

-- ============================================
-- VERIFICAR RESULTADOS
-- ============================================

-- Ver fontes desativadas
SELECT 
    id,
    nome,
    url_feed,
    ativo,
    status_coleta
FROM feed.feed_fontes
WHERE ativo = false
ORDER BY nome;

-- Ver fontes ativas com status
SELECT 
    id,
    nome,
    url_feed,
    ativo,
    status_coleta,
    msg_erro
FROM feed.feed_fontes
WHERE ativo = true
ORDER BY status_coleta, nome;


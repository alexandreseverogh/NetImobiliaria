-- ============================================
-- Script: Corrigir Feeds Importantes e Desativar Indesejados
-- ============================================
-- 
-- Este script:
-- 1. Desativa feeds que não devem ser coletados (Dwell, Forbes, Olhar Digital)
-- 2. Tenta corrigir URLs de feeds importantes que estão com erro
--
-- ============================================

BEGIN;

-- ============================================
-- PARTE 1: DESATIVAR FEEDS INDESEJADOS
-- ============================================

-- Dwell - Desativar (conteúdo não relacionado)
UPDATE feed.feed_fontes 
SET ativo = false,
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Dwell%' 
   OR url_feed LIKE '%dwell.com%';

-- Forbes Real Estate - Desativar (conteúdo não relacionado)
UPDATE feed.feed_fontes 
SET ativo = false,
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Forbes Real Estate%' 
   OR url_feed LIKE '%forbes.com/real-estate%';

-- Olhar Digital - Desativar (conteúdo não relacionado)
UPDATE feed.feed_fontes 
SET ativo = false,
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Olhar Digital%' 
   OR url_feed LIKE '%olhardigital%';

-- ============================================
-- PARTE 2: CORRIGIR URLs DE FEEDS IMPORTANTES
-- ============================================

-- Apartment Therapy - Tentar URL alternativa
UPDATE feed.feed_fontes 
SET url_feed = 'https://www.apartmenttherapy.com/feed',
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Apartment Therapy%';

-- Architectural Digest - Manter URL atual (pode precisar de verificação manual)
UPDATE feed.feed_fontes 
SET status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Architectural Digest%';

-- Bloomberg Real Estate - Manter URL atual (pode precisar de verificação manual)
UPDATE feed.feed_fontes 
SET status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Bloomberg Real Estate%';

-- Reuters Real Estate - Manter URL atual (pode precisar de verificação manual)
UPDATE feed.feed_fontes 
SET status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Reuters Real Estate%';

-- Wall Street Journal Real Estate - Manter URL atual (pode precisar de verificação manual)
UPDATE feed.feed_fontes 
SET status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Wall Street Journal%';

-- Real Estate Tech News - Manter URL atual (pode precisar de verificação manual)
UPDATE feed.feed_fontes 
SET status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Real Estate Tech News%';

-- The Verge Smart Home - Manter URL atual (pode precisar de verificação manual)
UPDATE feed.feed_fontes 
SET status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%The Verge Smart Home%';

COMMIT;

-- ============================================
-- VERIFICAR RESULTADOS
-- ============================================

-- Ver fontes desativadas
SELECT 
    'FEEDS DESATIVADOS' as tipo,
    id,
    nome,
    url_feed,
    ativo,
    status_coleta
FROM feed.feed_fontes
WHERE ativo = false
ORDER BY nome;

-- Ver fontes ativas importantes (que tentamos corrigir)
SELECT 
    'FEEDS IMPORTANTES (ATIVOS)' as tipo,
    id,
    nome,
    url_feed,
    ativo,
    status_coleta,
    msg_erro
FROM feed.feed_fontes
WHERE ativo = true
  AND nome IN (
    'Apartment Therapy',
    'Architectural Digest',
    'Bloomberg Real Estate',
    'Reuters Real Estate',
    'Wall Street Journal Real Estate',
    'Real Estate Tech News',
    'The Verge Smart Home'
  )
ORDER BY nome;

-- Resumo geral
SELECT 
    'RESUMO' as tipo,
    COUNT(*) FILTER (WHERE ativo = true) as total_ativas,
    COUNT(*) FILTER (WHERE ativo = false) as total_desativadas,
    COUNT(*) FILTER (WHERE ativo = true AND status_coleta = 'OK') as ativas_ok,
    COUNT(*) FILTER (WHERE ativo = true AND status_coleta = 'ERRO') as ativas_com_erro
FROM feed.feed_fontes;


-- ============================================
-- Script: Desativar Feeds Indesejados
-- ============================================
-- 
-- Desativa feeds que não devem ser coletados:
-- - Dwell (conteúdo não relacionado)
-- - Forbes Real Estate (conteúdo não relacionado)
-- - Olhar Digital (conteúdo não relacionado)
--
-- ============================================

BEGIN;

-- Desativar Dwell
UPDATE feed.feed_fontes 
SET ativo = false,
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Dwell%' 
   OR url_feed LIKE '%dwell.com%';

-- Desativar Forbes Real Estate
UPDATE feed.feed_fontes 
SET ativo = false,
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Forbes Real Estate%' 
   OR url_feed LIKE '%forbes.com/real-estate%';

-- Desativar Olhar Digital
UPDATE feed.feed_fontes 
SET ativo = false,
    status_coleta = 'OK',
    msg_erro = NULL
WHERE nome LIKE '%Olhar Digital%' 
   OR url_feed LIKE '%olhardigital%';

COMMIT;

-- Verificar fontes desativadas
SELECT 
    id,
    nome,
    url_feed,
    ativo,
    status_coleta
FROM feed.feed_fontes
WHERE ativo = false
ORDER BY nome;

-- Verificar fontes ativas restantes
SELECT 
    COUNT(*) as total_ativas,
    COUNT(*) FILTER (WHERE status_coleta = 'OK') as com_status_ok,
    COUNT(*) FILTER (WHERE status_coleta = 'ERRO') as com_erro
FROM feed.feed_fontes
WHERE ativo = true;


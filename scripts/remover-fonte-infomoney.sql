-- ============================================
-- Script: Remover/Desativar Fonte InfoMoney
-- ============================================
-- 
-- Este script desativa a fonte InfoMoney e seus conteúdos
-- para que não sejam mais coletados nem exibidos
--
-- ============================================

-- 1. Verificar fonte InfoMoney antes de remover
SELECT 
    f.id,
    f.nome,
    f.url_feed,
    f.ativo,
    f.ultima_coleta,
    COUNT(c.id) as total_conteudos
FROM feed.feed_fontes f
LEFT JOIN feed.feed_conteudos c ON f.id = c.fonte_fk
WHERE f.url_feed LIKE '%infomoney%' 
   OR f.nome LIKE '%InfoMoney%'
GROUP BY f.id, f.nome, f.url_feed, f.ativo, f.ultima_coleta;

-- 2. Desativar fonte InfoMoney (para não coletar mais)
UPDATE feed.feed_fontes 
SET ativo = false 
WHERE url_feed LIKE '%infomoney%' 
   OR nome LIKE '%InfoMoney%';

-- 3. Desativar conteúdos já coletados (para não aparecerem na página)
UPDATE feed.feed_conteudos 
SET ativo = false 
WHERE fonte_fk IN (
    SELECT id FROM feed.feed_fontes 
    WHERE url_feed LIKE '%infomoney%' 
       OR nome LIKE '%InfoMoney%'
);

-- 4. Verificar resultado
SELECT 
    f.nome,
    f.ativo as fonte_ativa,
    COUNT(c.id) as total_conteudos,
    COUNT(CASE WHEN c.ativo THEN 1 END) as conteudos_ativos,
    COUNT(CASE WHEN c.ativo = false THEN 1 END) as conteudos_desativados
FROM feed.feed_fontes f
LEFT JOIN feed.feed_conteudos c ON f.id = c.fonte_fk
WHERE f.url_feed LIKE '%infomoney%' 
   OR f.nome LIKE '%InfoMoney%'
GROUP BY f.id, f.nome, f.ativo;

-- ============================================
-- RESULTADO ESPERADO:
-- - fonte_ativa = false
-- - conteudos_ativos = 0
-- - conteudos_desativados = total_conteudos
-- ============================================

-- ============================================
-- OPÇÃO ALTERNATIVA: DELETAR COMPLETAMENTE
-- (Descomente se quiser deletar em vez de desativar)
-- ============================================

/*
-- ATENÇÃO: Isso remove permanentemente!

-- 1. Deletar conteúdos
DELETE FROM feed.feed_conteudos 
WHERE fonte_fk IN (
    SELECT id FROM feed.feed_fontes 
    WHERE url_feed LIKE '%infomoney%' 
       OR nome LIKE '%InfoMoney%'
);

-- 2. Deletar jobs
DELETE FROM feed.feed_jobs 
WHERE fonte_fk IN (
    SELECT id FROM feed.feed_fontes 
    WHERE url_feed LIKE '%infomoney%' 
       OR nome LIKE '%InfoMoney%'
);

-- 3. Deletar fonte
DELETE FROM feed.feed_fontes 
WHERE url_feed LIKE '%infomoney%' 
   OR nome LIKE '%InfoMoney%';
*/


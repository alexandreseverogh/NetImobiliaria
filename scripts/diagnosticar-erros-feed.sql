-- ============================================
-- Script: Diagnosticar Erros nas Fontes de Feed
-- ============================================
-- 
-- Este script identifica quais fontes estão com erro
-- e mostra detalhes sobre os problemas
--
-- ============================================

-- 1. Ver todas as fontes com erro
SELECT 
    f.id,
    f.nome,
    f.url_feed,
    f.status_coleta,
    f.msg_erro,
    f.ultima_coleta,
    f.ativo,
    COUNT(c.id) as total_conteudos,
    MAX(c.data_publicacao) as conteudo_mais_recente
FROM feed.feed_fontes f
LEFT JOIN feed.feed_conteudos c ON f.id = c.fonte_fk
WHERE f.status_coleta = 'ERRO'
GROUP BY f.id, f.nome, f.url_feed, f.status_coleta, f.msg_erro, f.ultima_coleta, f.ativo
ORDER BY f.nome;

-- 2. Ver jobs falhados recentemente
SELECT 
    j.id,
    j.fonte_fk,
    f.nome as fonte_nome,
    f.url_feed,
    j.status,
    j.log_erro,
    j.tentativas,
    j.created_at,
    j.finalizado_em
FROM feed.feed_jobs j
JOIN feed.feed_fontes f ON j.fonte_fk = f.id
WHERE j.status = 'FAILED'
  AND j.created_at > NOW() - INTERVAL '7 days'
ORDER BY j.finalizado_em DESC
LIMIT 20;

-- 3. Ver fontes que nunca coletaram com sucesso
SELECT 
    f.id,
    f.nome,
    f.url_feed,
    f.status_coleta,
    f.msg_erro,
    f.ultima_coleta,
    COUNT(j.id) FILTER (WHERE j.status = 'FAILED') as total_falhas,
    COUNT(j.id) FILTER (WHERE j.status = 'COMPLETED') as total_sucessos
FROM feed.feed_fontes f
LEFT JOIN feed.feed_jobs j ON f.id = j.fonte_fk
WHERE f.ativo = true
  AND (f.ultima_coleta IS NULL OR f.status_coleta = 'ERRO')
GROUP BY f.id, f.nome, f.url_feed, f.status_coleta, f.msg_erro, f.ultima_coleta
ORDER BY total_falhas DESC, f.nome;

-- 4. Resumo geral
SELECT 
    COUNT(*) FILTER (WHERE status_coleta = 'OK') as fontes_ok,
    COUNT(*) FILTER (WHERE status_coleta = 'ERRO') as fontes_erro,
    COUNT(*) FILTER (WHERE ultima_coleta IS NULL) as fontes_nunca_coletadas,
    COUNT(*) FILTER (WHERE ativo = true) as fontes_ativas,
    COUNT(*) FILTER (WHERE ativo = false) as fontes_inativas
FROM feed.feed_fontes;


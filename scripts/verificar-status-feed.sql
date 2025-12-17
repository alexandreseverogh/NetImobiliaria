-- Script SQL para verificar status do serviço de feed
-- Execute no banco de dados

-- 1. Verificar última coleta de cada fonte
SELECT 
    nome,
    ultima_coleta,
    status_coleta,
    CASE 
        WHEN ultima_coleta > NOW() - INTERVAL '2 hours' THEN 'ATIVO'
        WHEN ultima_coleta > NOW() - INTERVAL '24 hours' THEN 'PARADO HA POUCO'
        WHEN ultima_coleta IS NULL THEN 'NUNCA COLETOU'
        ELSE 'PARADO HA MUITO TEMPO'
    END as status_servico
FROM feed.feed_fontes
WHERE ativo = true
ORDER BY ultima_coleta DESC NULLS LAST;

-- 2. Verificar jobs recentes
SELECT 
    j.id,
    f.nome as fonte,
    j.status,
    j.created_at,
    j.finalizado_em,
    CASE 
        WHEN j.status = 'COMPLETED' THEN 'SUCESSO'
        WHEN j.status = 'FAILED' THEN 'FALHOU'
        WHEN j.status = 'PENDING' THEN 'PENDENTE'
        WHEN j.status = 'PROCESSING' THEN 'PROCESSANDO'
    END as status_descricao
FROM feed.feed_jobs j
JOIN feed.feed_fontes f ON j.fonte_fk = f.id
WHERE j.created_at > NOW() - INTERVAL '24 hours'
ORDER BY j.created_at DESC
LIMIT 20;

-- 3. Contar conteúdos coletados
SELECT 
    COUNT(*) as total_conteudos,
    COUNT(CASE WHEN ativo THEN 1 END) as ativos,
    MAX(data_publicacao) as mais_recente,
    MIN(data_publicacao) as mais_antigo
FROM feed.feed_conteudos;

-- 4. Conteúdos por fonte
SELECT 
    f.nome as fonte,
    COUNT(c.id) as total_conteudos,
    MAX(c.data_publicacao) as ultimo_conteudo
FROM feed.feed_fontes f
LEFT JOIN feed.feed_conteudos c ON f.id = c.fonte_fk
WHERE f.ativo = true
GROUP BY f.id, f.nome
ORDER BY total_conteudos DESC;


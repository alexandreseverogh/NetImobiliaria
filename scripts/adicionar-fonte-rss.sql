-- ============================================
-- Script: Adicionar Nova Fonte RSS Manualmente
-- ============================================
-- 
-- INSTRUÇÕES:
-- 1. Substitua os valores entre <<>> pelos seus dados
-- 2. Execute o script no banco de dados
-- 3. Execute o segundo INSERT para criar o job
-- 4. Aguarde o cron processar ou processe manualmente
--
-- ============================================

-- ============================================
-- 1. ADICIONAR FONTE
-- ============================================

INSERT INTO feed.feed_fontes (
    nome,
    url_feed,
    categoria_fk,
    idioma,
    tipo,
    ativo,
    status_coleta
) VALUES (
    '<<NOME_DA_FONTE>>',                    -- Ex: 'Arquitetura e Urbanismo'
    '<<URL_DO_FEED_RSS>>',                 -- Ex: 'https://exemplo.com/rss'
    (SELECT id FROM feed.feed_categorias WHERE slug = '<<SLUG_CATEGORIA>>'),  -- Ex: 'tendencias'
    '<<IDIOMA>>',                           -- Ex: 'pt', 'en', 'es'
    'RSS',
    true,
    'OK'
);

-- ============================================
-- 2. CRIAR JOB PARA PROCESSAR
-- ============================================

INSERT INTO feed.feed_jobs (fonte_fk, status, created_at)
SELECT id, 'PENDING', NOW()
FROM feed.feed_fontes
WHERE url_feed = '<<URL_DO_FEED_RSS>>'  -- Mesma URL do passo 1
  AND id NOT IN (
    SELECT fonte_fk FROM feed.feed_jobs 
    WHERE status = 'PENDING'
  );

-- ============================================
-- 3. VERIFICAR SE FOI ADICIONADA
-- ============================================

SELECT 
    f.id,
    f.nome,
    f.url_feed,
    f.idioma,
    c.nome as categoria,
    f.ativo,
    f.status_coleta
FROM feed.feed_fontes f
LEFT JOIN feed.feed_categorias c ON f.categoria_fk = c.id
WHERE f.url_feed = '<<URL_DO_FEED_RSS>>';

-- ============================================
-- EXEMPLO PRÁTICO (DESCOMENTE E USE):
-- ============================================

/*
-- Exemplo: Adicionar feed de arquitetura em português
INSERT INTO feed.feed_fontes (
    nome,
    url_feed,
    categoria_fk,
    idioma,
    tipo,
    ativo,
    status_coleta
) VALUES (
    'Arquitetura e Urbanismo',
    'https://exemplo.com/arquitetura/rss',
    (SELECT id FROM feed.feed_categorias WHERE slug = 'decoracao'),
    'pt',
    'RSS',
    true,
    'OK'
);

-- Criar job
INSERT INTO feed.feed_jobs (fonte_fk, status, created_at)
SELECT id, 'PENDING', NOW()
FROM feed.feed_fontes
WHERE url_feed = 'https://exemplo.com/arquitetura/rss';
*/


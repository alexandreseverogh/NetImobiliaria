-- ============================================
-- Script: Adicionar Novas Fontes RSS Internacionais
-- ============================================
-- 
-- Adiciona fontes internacionais de mercado imobiliário, arquitetura e tecnologia
-- Todas serão traduzidas automaticamente para português
--
-- ============================================

-- Verificar quais fontes já existem
SELECT 
    f.id,
    f.nome,
    f.url_feed,
    f.ativo
FROM feed.feed_fontes f
WHERE f.url_feed LIKE '%zillow%' 
   OR f.url_feed LIKE '%realtor%'
   OR f.url_feed LIKE '%archdaily%'
   OR f.url_feed LIKE '%dezeen%'
   OR f.url_feed LIKE '%architecturaldigest%'
   OR f.url_feed LIKE '%dwell%'
   OR f.url_feed LIKE '%apartmenttherapy%'
   OR f.url_feed LIKE '%propmodo%'
   OR f.url_feed LIKE '%cnet%'
   OR f.url_feed LIKE '%theverge%'
   OR f.url_feed LIKE '%coindesk%'
ORDER BY f.nome;

-- ============================================
-- ADICIONAR NOVAS FONTES
-- ============================================

-- 1. Zillow Research (Mercado Imobiliário - EUA)
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, idioma, tipo, ativo, status_coleta)
SELECT 
    'Zillow Research',
    'https://www.zillow.com/research/data/feed/',
    (SELECT id FROM feed.feed_categorias WHERE slug = 'mercado-financeiro'),
    'en',
    'RSS',
    true,
    'OK'
WHERE NOT EXISTS (
    SELECT 1 FROM feed.feed_fontes WHERE url_feed = 'https://www.zillow.com/research/data/feed/'
);

-- 2. Realtor.com (Mercado Imobiliário - EUA)
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, idioma, tipo, ativo, status_coleta)
SELECT 
    'Realtor.com',
    'https://www.realtor.com/news/feed/',
    (SELECT id FROM feed.feed_categorias WHERE slug = 'tendencias'),
    'en',
    'RSS',
    true,
    'OK'
WHERE NOT EXISTS (
    SELECT 1 FROM feed.feed_fontes WHERE url_feed = 'https://www.realtor.com/news/feed/'
);

-- 3. ArchDaily (já existe, mas verificar URL)
-- NOTA: ArchDaily já foi adicionado anteriormente, mas vamos verificar se a URL está correta
UPDATE feed.feed_fontes 
SET url_feed = 'https://www.archdaily.com/rss'
WHERE nome LIKE '%ArchDaily%' 
  AND url_feed != 'https://www.archdaily.com/rss';

-- 4. Dezeen (já existe, mas verificar)
-- NOTA: Dezeen já foi adicionado anteriormente

-- 5. Architectural Digest (Decoração/Arquitetura - EUA)
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, idioma, tipo, ativo, status_coleta)
SELECT 
    'Architectural Digest',
    'https://www.architecturaldigest.com/feed/rss',
    (SELECT id FROM feed.feed_categorias WHERE slug = 'decoracao'),
    'en',
    'RSS',
    true,
    'OK'
WHERE NOT EXISTS (
    SELECT 1 FROM feed.feed_fontes WHERE url_feed = 'https://www.architecturaldigest.com/feed/rss'
);

-- 6. Dwell (Decoração/Arquitetura - EUA)
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, idioma, tipo, ativo, status_coleta)
SELECT 
    'Dwell',
    'https://www.dwell.com/feed',
    (SELECT id FROM feed.feed_categorias WHERE slug = 'decoracao'),
    'en',
    'RSS',
    true,
    'OK'
WHERE NOT EXISTS (
    SELECT 1 FROM feed.feed_fontes WHERE url_feed = 'https://www.dwell.com/feed'
);

-- 7. Apartment Therapy (Decoração - EUA)
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, idioma, tipo, ativo, status_coleta)
SELECT 
    'Apartment Therapy',
    'https://www.apartmenttherapy.com/rss.xml',
    (SELECT id FROM feed.feed_categorias WHERE slug = 'decoracao'),
    'en',
    'RSS',
    true,
    'OK'
WHERE NOT EXISTS (
    SELECT 1 FROM feed.feed_fontes WHERE url_feed = 'https://www.apartmenttherapy.com/rss.xml'
);

-- 8. Propmodo (PropTech - EUA)
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, idioma, tipo, ativo, status_coleta)
SELECT 
    'Propmodo',
    'https://www.propmodo.com/feed/',
    (SELECT id FROM feed.feed_categorias WHERE slug = 'tecnologia'),
    'en',
    'RSS',
    true,
    'OK'
WHERE NOT EXISTS (
    SELECT 1 FROM feed.feed_fontes WHERE url_feed = 'https://www.propmodo.com/feed/'
);

-- 9. CNET Smart Home (Tecnologia - EUA)
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, idioma, tipo, ativo, status_coleta)
SELECT 
    'CNET Smart Home',
    'https://www.cnet.com/rss/news/smart-home/',
    (SELECT id FROM feed.feed_categorias WHERE slug = 'tecnologia'),
    'en',
    'RSS',
    true,
    'OK'
WHERE NOT EXISTS (
    SELECT 1 FROM feed.feed_fontes WHERE url_feed = 'https://www.cnet.com/rss/news/smart-home/'
);

-- 10. The Verge Smart Home (Tecnologia - EUA)
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, idioma, tipo, ativo, status_coleta)
SELECT 
    'The Verge Smart Home',
    'https://www.theverge.com/smart-home/rss/index.xml',
    (SELECT id FROM feed.feed_categorias WHERE slug = 'tecnologia'),
    'en',
    'RSS',
    true,
    'OK'
WHERE NOT EXISTS (
    SELECT 1 FROM feed.feed_fontes WHERE url_feed = 'https://www.theverge.com/smart-home/rss/index.xml'
);

-- 11. CoinDesk (Tokenização/RWA - EUA)
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, idioma, tipo, ativo, status_coleta)
SELECT 
    'CoinDesk',
    'https://www.coindesk.com/arc/outboundfeeds/rss/',
    (SELECT id FROM feed.feed_categorias WHERE slug = 'tokenizacao'),
    'en',
    'RSS',
    true,
    'OK'
WHERE NOT EXISTS (
    SELECT 1 FROM feed.feed_fontes WHERE url_feed = 'https://www.coindesk.com/arc/outboundfeeds/rss/'
);

-- ============================================
-- VERIFICAR FONTES ADICIONADAS
-- ============================================

SELECT 
    f.id,
    f.nome,
    f.url_feed,
    f.idioma,
    c.nome as categoria,
    f.ativo
FROM feed.feed_fontes f
LEFT JOIN feed.feed_categorias c ON f.categoria_fk = c.id
WHERE f.nome IN (
    'Zillow Research',
    'Realtor.com',
    'Architectural Digest',
    'Dwell',
    'Apartment Therapy',
    'Propmodo',
    'CNET Smart Home',
    'The Verge Smart Home',
    'CoinDesk'
)
   OR f.url_feed LIKE '%archdaily%'
   OR f.url_feed LIKE '%dezeen%'
ORDER BY f.nome;

-- ============================================
-- CRIAR JOBS PARA PROCESSAR NOVAS FONTES
-- ============================================

INSERT INTO feed.feed_jobs (fonte_fk, status, created_at)
SELECT f.id, 'PENDING', NOW()
FROM feed.feed_fontes f
WHERE f.nome IN (
    'Zillow Research',
    'Realtor.com',
    'Architectural Digest',
    'Dwell',
    'Apartment Therapy',
    'Propmodo',
    'CNET Smart Home',
    'The Verge Smart Home',
    'CoinDesk'
)
  AND f.id NOT IN (
    SELECT fonte_fk FROM feed.feed_jobs WHERE status = 'PENDING'
  );


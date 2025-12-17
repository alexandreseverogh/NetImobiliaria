-- ============================================
-- Migration: Seed Manual de Feed - Categorias e Fontes
-- Data: 2025-01-XX
-- Descrição: Insere categorias e fontes do feed manualmente
-- ============================================

-- Garantir que o schema existe
CREATE SCHEMA IF NOT EXISTS feed;

-- Garantir que as tabelas existem
CREATE TABLE IF NOT EXISTS feed.feed_categorias (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(100) NOT NULL UNIQUE,
    cor VARCHAR(7),
    icone VARCHAR(50),
    ativo BOOLEAN DEFAULT true,
    ordem INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feed.feed_fontes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    url_feed VARCHAR(500) NOT NULL,
    tipo VARCHAR(20) DEFAULT 'RSS',
    categoria_fk INTEGER REFERENCES feed.feed_categorias(id),
    ativo BOOLEAN DEFAULT true,
    ultima_coleta TIMESTAMP,
    status_coleta VARCHAR(20) DEFAULT 'OK',
    msg_erro TEXT,
    intervalo_minutos INTEGER DEFAULT 240,
    idioma VARCHAR(10) DEFAULT 'pt',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Adicionar constraint UNIQUE em url_feed se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'feed_fontes_url_feed_key' 
        AND conrelid = 'feed.feed_fontes'::regclass
    ) THEN
        ALTER TABLE feed.feed_fontes ADD CONSTRAINT feed_fontes_url_feed_key UNIQUE (url_feed);
    END IF;
END $$;

-- Garantir que a constraint UNIQUE existe (se a tabela já existia, adiciona)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'feed_fontes_url_feed_key' 
        AND conrelid = 'feed.feed_fontes'::regclass
    ) THEN
        ALTER TABLE feed.feed_fontes ADD CONSTRAINT feed_fontes_url_feed_key UNIQUE (url_feed);
    END IF;
END $$;

-- ============================================
-- 1. INSERIR CATEGORIAS
-- ============================================

INSERT INTO feed.feed_categorias (nome, slug, cor, icone, ordem) VALUES
('Mercado Financeiro', 'mercado-financeiro', '#2563EB', 'CurrencyDollarIcon', 1),
('Tecnologia', 'tecnologia', '#7C3AED', 'CpuChipIcon', 2),
('Decoração', 'decoracao', '#EA580C', 'HomeModernIcon', 3),
('Tendências', 'tendencias', '#D97706', 'ArrowTrendingUpIcon', 4),
('Segurança', 'seguranca', '#DC2626', 'ShieldCheckIcon', 5),
('História', 'historia', '#4B5563', 'AcademicCapIcon', 6),
('Tokenização', 'tokenizacao', '#8B5CF6', 'QrCodeIcon', 7)
ON CONFLICT (slug) DO UPDATE SET 
    icone = EXCLUDED.icone, 
    cor = EXCLUDED.cor,
    ordem = EXCLUDED.ordem;

-- ============================================
-- 2. INSERIR FONTES BRASILEIRAS
-- ============================================

-- InfoMoney - Mercados
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, status_coleta, idioma)
SELECT 
    'InfoMoney - Mercados',
    'https://www.infomoney.com.br/mercados/feed/',
    id,
    'OK',
    'pt'
FROM feed.feed_categorias WHERE slug = 'mercado-financeiro'
ON CONFLICT (url_feed) DO UPDATE SET 
    nome = EXCLUDED.nome,
    idioma = EXCLUDED.idioma,
    categoria_fk = EXCLUDED.categoria_fk;

-- Exame - Investimentos
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, status_coleta, idioma)
SELECT 
    'Exame - Investimentos',
    'https://exame.com/invest/feed/',
    id,
    'OK',
    'pt'
FROM feed.feed_categorias WHERE slug = 'tendencias'
ON CONFLICT (url_feed) DO UPDATE SET 
    nome = EXCLUDED.nome,
    idioma = EXCLUDED.idioma,
    categoria_fk = EXCLUDED.categoria_fk;

-- Casa Vogue
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, status_coleta, idioma)
SELECT 
    'Casa Vogue',
    'https://casavogue.globo.com/rss/casavogue/',
    id,
    'OK',
    'pt'
FROM feed.feed_categorias WHERE slug = 'decoracao'
ON CONFLICT (url_feed) DO UPDATE SET 
    nome = EXCLUDED.nome,
    idioma = EXCLUDED.idioma,
    categoria_fk = EXCLUDED.categoria_fk;

-- CoinTelegraph Brasil
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, status_coleta, idioma)
SELECT 
    'CoinTelegraph Brasil',
    'https://br.cointelegraph.com/rss',
    id,
    'OK',
    'pt'
FROM feed.feed_categorias WHERE slug = 'tokenizacao'
ON CONFLICT (url_feed) DO UPDATE SET 
    nome = EXCLUDED.nome,
    idioma = EXCLUDED.idioma,
    categoria_fk = EXCLUDED.categoria_fk;

-- ============================================
-- 3. INSERIR FONTES INTERNACIONAIS
-- ============================================

-- Reuters Real Estate
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, status_coleta, idioma)
SELECT 
    'Reuters Real Estate',
    'https://www.reuters.com/rssFeed/realEstate',
    id,
    'OK',
    'en'
FROM feed.feed_categorias WHERE slug = 'tendencias'
ON CONFLICT (url_feed) DO UPDATE SET 
    nome = EXCLUDED.nome,
    idioma = EXCLUDED.idioma,
    categoria_fk = EXCLUDED.categoria_fk;

-- Bloomberg Real Estate
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, status_coleta, idioma)
SELECT 
    'Bloomberg Real Estate',
    'https://www.bloomberg.com/feeds/real-estate.rss',
    id,
    'OK',
    'en'
FROM feed.feed_categorias WHERE slug = 'mercado-financeiro'
ON CONFLICT (url_feed) DO UPDATE SET 
    nome = EXCLUDED.nome,
    idioma = EXCLUDED.idioma,
    categoria_fk = EXCLUDED.categoria_fk;

-- Wall Street Journal Real Estate
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, status_coleta, idioma)
SELECT 
    'Wall Street Journal Real Estate',
    'https://feeds.a.dj.com/rss/RSSRealEstate.xml',
    id,
    'OK',
    'en'
FROM feed.feed_categorias WHERE slug = 'mercado-financeiro'
ON CONFLICT (url_feed) DO UPDATE SET 
    nome = EXCLUDED.nome,
    idioma = EXCLUDED.idioma,
    categoria_fk = EXCLUDED.categoria_fk;

-- Forbes Real Estate
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, status_coleta, idioma)
SELECT 
    'Forbes Real Estate',
    'https://www.forbes.com/real-estate/feed/',
    id,
    'OK',
    'en'
FROM feed.feed_categorias WHERE slug = 'tendencias'
ON CONFLICT (url_feed) DO UPDATE SET 
    nome = EXCLUDED.nome,
    idioma = EXCLUDED.idioma,
    categoria_fk = EXCLUDED.categoria_fk;

-- ArchDaily
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, status_coleta, idioma)
SELECT 
    'ArchDaily',
    'https://www.archdaily.com/rss',
    id,
    'OK',
    'en'
FROM feed.feed_categorias WHERE slug = 'decoracao'
ON CONFLICT (url_feed) DO UPDATE SET 
    nome = EXCLUDED.nome,
    idioma = EXCLUDED.idioma,
    categoria_fk = EXCLUDED.categoria_fk;

-- Dezeen Architecture
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, status_coleta, idioma)
SELECT 
    'Dezeen Architecture',
    'https://www.dezeen.com/architecture/feed/',
    id,
    'OK',
    'en'
FROM feed.feed_categorias WHERE slug = 'decoracao'
ON CONFLICT (url_feed) DO UPDATE SET 
    nome = EXCLUDED.nome,
    idioma = EXCLUDED.idioma,
    categoria_fk = EXCLUDED.categoria_fk;

-- PropTech News
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, status_coleta, idioma)
SELECT 
    'PropTech News',
    'https://www.proptechnews.com/feed/',
    id,
    'OK',
    'en'
FROM feed.feed_categorias WHERE slug = 'tecnologia'
ON CONFLICT (url_feed) DO UPDATE SET 
    nome = EXCLUDED.nome,
    idioma = EXCLUDED.idioma,
    categoria_fk = EXCLUDED.categoria_fk;

-- Real Estate Tech News
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, status_coleta, idioma)
SELECT 
    'Real Estate Tech News',
    'https://www.realestatetechnews.com/feed/',
    id,
    'OK',
    'en'
FROM feed.feed_categorias WHERE slug = 'tecnologia'
ON CONFLICT (url_feed) DO UPDATE SET 
    nome = EXCLUDED.nome,
    idioma = EXCLUDED.idioma,
    categoria_fk = EXCLUDED.categoria_fk;

-- CoinTelegraph Real Estate
INSERT INTO feed.feed_fontes (nome, url_feed, categoria_fk, status_coleta, idioma)
SELECT 
    'CoinTelegraph Real Estate',
    'https://cointelegraph.com/rss/tag/real-estate',
    id,
    'OK',
    'en'
FROM feed.feed_categorias WHERE slug = 'tokenizacao'
ON CONFLICT (url_feed) DO UPDATE SET 
    nome = EXCLUDED.nome,
    idioma = EXCLUDED.idioma,
    categoria_fk = EXCLUDED.categoria_fk;

-- ============================================
-- 4. VERIFICAR INSERÇÕES
-- ============================================

-- Mostrar categorias criadas
SELECT 'Categorias criadas:' as info;
SELECT id, nome, slug FROM feed.feed_categorias ORDER BY ordem;

-- Mostrar fontes criadas
SELECT 'Fontes criadas:' as info;
SELECT 
    f.id,
    f.nome,
    f.url_feed,
    f.idioma,
    c.nome as categoria,
    f.ativo
FROM feed.feed_fontes f
LEFT JOIN feed.feed_categorias c ON f.categoria_fk = c.id
ORDER BY f.idioma, f.nome;


-- =====================================================
-- CORREÇÃO DO SCHEMA - AMENIDADES E PROXIMIDADES
-- Net Imobiliária - Adicionar colunas faltantes
-- =====================================================

-- Adicionar coluna 'icone' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'amenidades' AND column_name = 'icone') THEN
        ALTER TABLE amenidades ADD COLUMN icone VARCHAR(50);
        RAISE NOTICE 'Coluna "icone" adicionada à tabela amenidades';
    ELSE
        RAISE NOTICE 'Coluna "icone" já existe na tabela amenidades';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proximidades' AND column_name = 'icone') THEN
        ALTER TABLE proximidades ADD COLUMN icone VARCHAR(50);
        RAISE NOTICE 'Coluna "icone" adicionada à tabela proximidades';
    ELSE
        RAISE NOTICE 'Coluna "icone" já existe na tabela proximidades';
    END IF;
END $$;

-- Adicionar coluna 'popular' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'amenidades' AND column_name = 'popular') THEN
        ALTER TABLE amenidades ADD COLUMN popular BOOLEAN DEFAULT false;
        RAISE NOTICE 'Coluna "popular" adicionada à tabela amenidades';
    ELSE
        RAISE NOTICE 'Coluna "popular" já existe na tabela amenidades';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proximidades' AND column_name = 'popular') THEN
        ALTER TABLE proximidades ADD COLUMN popular BOOLEAN DEFAULT false;
        RAISE NOTICE 'Coluna "popular" adicionada à tabela proximidades';
    ELSE
        RAISE NOTICE 'Coluna "popular" já existe na tabela proximidades';
    END IF;
END $$;

-- Adicionar coluna 'ordem' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'amenidades' AND column_name = 'ordem') THEN
        ALTER TABLE amenidades ADD COLUMN ordem INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna "ordem" adicionada à tabela amenidades';
    ELSE
        RAISE NOTICE 'Coluna "ordem" já existe na tabela amenidades';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'proximidades' AND column_name = 'ordem') THEN
        ALTER TABLE proximidades ADD COLUMN ordem INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna "ordem" adicionada à tabela proximidades';
    ELSE
        RAISE NOTICE 'Coluna "ordem" já existe na tabela proximidades';
    END IF;
END $$;

-- Adicionar coluna 'icone' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'categorias_amenidades' AND column_name = 'icone') THEN
        ALTER TABLE categorias_amenidades ADD COLUMN icone VARCHAR(50);
        RAISE NOTICE 'Coluna "icone" adicionada à tabela categorias_amenidades';
    ELSE
        RAISE NOTICE 'Coluna "icone" já existe na tabela categorias_amenidades';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'categorias_proximidades' AND column_name = 'icone') THEN
        ALTER TABLE categorias_proximidades ADD COLUMN icone VARCHAR(50);
        RAISE NOTICE 'Coluna "icone" adicionada à tabela categorias_proximidades';
    ELSE
        RAISE NOTICE 'Coluna "icone" já existe na tabela categorias_proximidades';
    END IF;
END $$;

-- Adicionar coluna 'cor' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'categorias_amenidades' AND column_name = 'cor') THEN
        ALTER TABLE categorias_amenidades ADD COLUMN cor VARCHAR(7) DEFAULT '#3B82F6';
        RAISE NOTICE 'Coluna "cor" adicionada à tabela categorias_amenidades';
    ELSE
        RAISE NOTICE 'Coluna "cor" já existe na tabela categorias_amenidades';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'categorias_proximidades' AND column_name = 'cor') THEN
        ALTER TABLE categorias_proximidades ADD COLUMN cor VARCHAR(7) DEFAULT '#10B981';
        RAISE NOTICE 'Coluna "cor" adicionada à tabela categorias_proximidades';
    ELSE
        RAISE NOTICE 'Coluna "cor" já existe na tabela categorias_proximidades';
    END IF;
END $$;

-- Adicionar coluna 'ordem' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'categorias_amenidades' AND column_name = 'ordem') THEN
        ALTER TABLE categorias_amenidades ADD COLUMN ordem INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna "ordem" adicionada à tabela categorias_amenidades';
    ELSE
        RAISE NOTICE 'Coluna "ordem" já existe na tabela categorias_amenidades';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'categorias_proximidades' AND column_name = 'ordem') THEN
        ALTER TABLE categorias_proximidades ADD COLUMN ordem INTEGER DEFAULT 0;
        RAISE NOTICE 'Coluna "ordem" adicionada à tabela categorias_proximidades';
    ELSE
        RAISE NOTICE 'Coluna "ordem" já existe na tabela categorias_proximidades';
    END IF;
END $$;

-- Adicionar coluna 'observacoes' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'imovel_amenidades' AND column_name = 'observacoes') THEN
        ALTER TABLE imovel_amenidades ADD COLUMN observacoes TEXT;
        RAISE NOTICE 'Coluna "observacoes" adicionada à tabela imovel_amenidades';
    ELSE
        RAISE NOTICE 'Coluna "observacoes" já existe na tabela imovel_amenidades';
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'imovel_proximidades' AND column_name = 'observacoes') THEN
        ALTER TABLE imovel_proximidades ADD COLUMN observacoes TEXT;
        RAISE NOTICE 'Coluna "observacoes" adicionada à tabela imovel_proximidades';
    ELSE
        RAISE NOTICE 'Coluna "observacoes" já existe na tabela imovel_proximidades';
    END IF;
END $$;

-- Adicionar coluna 'distancia_metros' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'imovel_proximidades' AND column_name = 'distancia_metros') THEN
        ALTER TABLE imovel_proximidades ADD COLUMN distancia_metros INTEGER;
        RAISE NOTICE 'Coluna "distancia_metros" adicionada à tabela imovel_proximidades';
    ELSE
        RAISE NOTICE 'Coluna "distancia_metros" já existe na tabela imovel_proximidades';
    END IF;
END $$;

-- Adicionar coluna 'tempo_caminhada' se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'imovel_proximidades' AND column_name = 'tempo_caminhada') THEN
        ALTER TABLE imovel_proximidades ADD COLUMN tempo_caminhada INTEGER;
        RAISE NOTICE 'Coluna "tempo_caminhada" adicionada à tabela imovel_proximidades';
    ELSE
        RAISE NOTICE 'Coluna "tempo_caminhada" já existe na tabela imovel_proximidades';
    END IF;
END $$;

-- Verificar estrutura das tabelas
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('amenidades', 'proximidades', 'categorias_amenidades', 'categorias_proximidades', 'imovel_amenidades', 'imovel_proximidades')
ORDER BY table_name, ordinal_position;

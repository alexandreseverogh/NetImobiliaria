-- ========================================
-- DESCOBRIR A REALIDADE DAS CATEGORIAS
-- ========================================
-- 
-- Script simples para descobrir EXATAMENTE o que existe

-- 1. VERIFICAR SE AS TABELAS EXISTEM
SELECT 
    table_name,
    'EXISTE' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('system_categorias', 'system_feature_categorias')
ORDER BY table_name;

-- 2. VER TODAS AS COLUNAS DE system_categorias
SELECT 
    'system_categorias' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'system_categorias'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. VER TODAS AS COLUNAS DE system_feature_categorias
SELECT 
    'system_feature_categorias' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'system_feature_categorias'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. VER DADOS DE system_categorias (se existir)
SELECT 
    'system_categorias' as tabela,
    COUNT(*) as total_registros
FROM system_categorias;

-- 5. VER DADOS DE system_feature_categorias (se existir)
SELECT 
    'system_feature_categorias' as tabela,
    COUNT(*) as total_registros
FROM system_feature_categorias;

-- 6. VER COMO system_features ESTÁ USANDO CATEGORIAS
SELECT 
    'system_features' as tabela,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'system_features'
AND table_schema = 'public'
AND column_name LIKE '%categor%'
ORDER BY ordinal_position;

-- 7. VER DADOS DE system_features
SELECT 
    'system_features' as tabela,
    COUNT(*) as total_registros
FROM system_features;

-- ========================================
-- ANÁLISE COMPLETA DAS TABELAS DE CATEGORIAS
-- ========================================
-- 
-- Este script analisa a estrutura e uso das tabelas de categorias
-- para identificar duplicações e inconsistências.

-- 1. VERIFICAR SE AS TABELAS EXISTEM
SELECT 
    table_name,
    CASE WHEN table_name IS NOT NULL THEN 'EXISTE' ELSE 'NÃO EXISTE' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('system_categorias', 'system_feature_categorias')
ORDER BY table_name;

-- 2. ANALISAR ESTRUTURA DE system_categorias (se existir)
SELECT 
    'system_categorias' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'system_categorias'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. ANALISAR ESTRUTURA DE system_feature_categorias (se existir)
SELECT 
    'system_feature_categorias' as tabela,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'system_feature_categorias'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. VERIFICAR DADOS EM system_categorias (se existir)
SELECT 
    'system_categorias' as tabela,
    COUNT(*) as total_registros,
    COUNT(DISTINCT name) as nomes_unicos,
    COUNT(DISTINCT slug) as slugs_unicos
FROM system_categorias;

-- 5. VERIFICAR DADOS EM system_feature_categorias (se existir)
SELECT 
    'system_feature_categorias' as tabela,
    COUNT(*) as total_registros,
    COUNT(DISTINCT description) as descricoes_unicas,
    COUNT(DISTINCT slug) as slugs_unicos
FROM system_feature_categorias;

-- 6. VERIFICAR COMO system_features ESTÁ USANDO CATEGORIAS
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

-- 7. VERIFICAR DADOS EM system_features
SELECT 
    'system_features' as tabela,
    COUNT(*) as total_registros,
    COUNT(DISTINCT category_id) as categorias_diferentes,
    COUNT(CASE WHEN category_id IS NULL THEN 1 END) as sem_categoria
FROM system_features;

-- 8. MOSTRAR RELACIONAMENTOS ATUAIS
SELECT 
    sf.id,
    sf.name as feature_name,
    sf.category_id,
    sc.name as categoria_name,
    sc.slug as categoria_slug
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
ORDER BY sf.name
LIMIT 10;

-- 9. VERIFICAR SE HÁ INCONSISTÊNCIAS
SELECT 
    'INCONSISTÊNCIAS' as tipo,
    COUNT(*) as total
FROM system_features sf
WHERE sf.category_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM system_categorias sc 
    WHERE sc.id = sf.category_id
);

-- 10. RESUMO DA SITUAÇÃO
SELECT 
    'RESUMO' as tipo,
    'system_categorias' as tabela,
    (SELECT COUNT(*) FROM system_categorias) as registros,
    (SELECT COUNT(DISTINCT name) FROM system_categorias) as nomes_unicos
UNION ALL
SELECT 
    'RESUMO' as tipo,
    'system_feature_categorias' as tabela,
    (SELECT COUNT(*) FROM system_feature_categorias) as registros,
    (SELECT COUNT(DISTINCT description) FROM system_feature_categorias) as descricoes_unicas
UNION ALL
SELECT 
    'RESUMO' as tipo,
    'system_features' as tabela,
    (SELECT COUNT(*) FROM system_features) as registros,
    (SELECT COUNT(DISTINCT category_id) FROM system_features) as categorias_usadas;

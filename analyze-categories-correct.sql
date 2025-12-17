-- ========================================
-- ANÁLISE CORRETA DAS CATEGORIAS
-- ========================================
-- 
-- Agora que entendemos a estrutura real:
-- - system_categorias = tabela de categorias
-- - system_feature_categorias = tabela de relacionamento

-- 1. VER DADOS DE system_categorias
SELECT 
    'system_categorias' as tabela,
    COUNT(*) as total_registros,
    COUNT(DISTINCT name) as nomes_unicos,
    COUNT(DISTINCT slug) as slugs_unicos
FROM system_categorias;

-- 2. VER DADOS DE system_feature_categorias (relacionamentos)
SELECT 
    'system_feature_categorias' as tabela,
    COUNT(*) as total_relacionamentos,
    COUNT(DISTINCT feature_id) as features_diferentes,
    COUNT(DISTINCT category_id) as categorias_diferentes
FROM system_feature_categorias;

-- 3. VER DADOS DE system_features
SELECT 
    'system_features' as tabela,
    COUNT(*) as total_registros,
    COUNT(DISTINCT category_id) as categorias_diretas,
    COUNT(CASE WHEN category_id IS NULL THEN 1 END) as sem_categoria_direta
FROM system_features;

-- 4. VER COMO system_features ESTÁ USANDO CATEGORIAS (direto)
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

-- 5. VER RELACIONAMENTOS VIA system_feature_categorias
SELECT 
    sf.id,
    sf.name as feature_name,
    sfc.category_id,
    sc.name as categoria_name,
    sc.slug as categoria_slug,
    sfc.sort_order
FROM system_features sf
JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
JOIN system_categorias sc ON sfc.category_id = sc.id
ORDER BY sf.name, sfc.sort_order
LIMIT 10;

-- 6. VERIFICAR INCONSISTÊNCIAS
SELECT 
    'INCONSISTÊNCIAS' as tipo,
    COUNT(*) as total
FROM system_features sf
WHERE sf.category_id IS NOT NULL 
AND NOT EXISTS (
    SELECT 1 FROM system_categorias sc 
    WHERE sc.id = sf.category_id
);

-- 7. RESUMO DA SITUAÇÃO
SELECT 
    'RESUMO' as tipo,
    'system_categorias' as tabela,
    (SELECT COUNT(*) FROM system_categorias) as registros,
    'Tabela de categorias' as descricao
UNION ALL
SELECT 
    'RESUMO' as tipo,
    'system_feature_categorias' as tabela,
    (SELECT COUNT(*) FROM system_feature_categorias) as registros,
    'Tabela de relacionamento' as descricao
UNION ALL
SELECT 
    'RESUMO' as tipo,
    'system_features' as tabela,
    (SELECT COUNT(*) FROM system_features) as registros,
    'Tabela de funcionalidades' as descricao;

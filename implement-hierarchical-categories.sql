-- ========================================
-- IMPLEMENTAR CATEGORIAS HIERÁRQUICAS
-- ========================================
-- 
-- Este script implementa a visão correta:
-- - Categorias = Agrupamento visual (sidebar)
-- - Funcionalidades = Permissões reais (RBAC)
-- - Relacionamento: Muitas funcionalidades → Uma categoria

-- 1. VERIFICAR SITUAÇÃO ATUAL
SELECT 
    'SITUAÇÃO ATUAL' as tipo,
    'system_categorias' as tabela,
    COUNT(*) as registros
FROM system_categorias
UNION ALL
SELECT 
    'SITUAÇÃO ATUAL' as tipo,
    'system_features' as tabela,
    COUNT(*) as registros
FROM system_features
UNION ALL
SELECT 
    'SITUAÇÃO ATUAL' as tipo,
    'system_feature_categorias' as tabela,
    COUNT(*) as registros
FROM system_feature_categorias;

-- 2. VER COMO ESTÁ SENDO USADO ATUALMENTE
SELECT 
    'USO ATUAL' as tipo,
    'Features com categoria direta' as descricao,
    COUNT(*) as total
FROM system_features
WHERE category_id IS NOT NULL
UNION ALL
SELECT 
    'USO ATUAL' as tipo,
    'Features via system_feature_categorias' as descricao,
    COUNT(*) as total
FROM system_features sf
JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
UNION ALL
SELECT 
    'USO ATUAL' as tipo,
    'Features sem categoria' as descricao,
    COUNT(*) as total
FROM system_features
WHERE category_id IS NULL
AND NOT EXISTS (
    SELECT 1 FROM system_feature_categorias sfc 
    WHERE sfc.feature_id = system_features.id
);

-- 3. MOSTRAR ESTRUTURA ATUAL DAS CATEGORIAS
SELECT 
    'CATEGORIAS EXISTENTES' as tipo,
    sc.id,
    sc.name as categoria,
    sc.slug,
    sc.description,
    COUNT(sf.id) as funcionalidades_vinculadas
FROM system_categorias sc
LEFT JOIN system_features sf ON sc.id = sf.category_id
GROUP BY sc.id, sc.name, sc.slug, sc.description
ORDER BY sc.name;

-- 4. MOSTRAR FUNCIONALIDADES SEM CATEGORIA
SELECT 
    'FUNCIONALIDADES SEM CATEGORIA' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sf.description
FROM system_features sf
WHERE sf.category_id IS NULL
AND NOT EXISTS (
    SELECT 1 FROM system_feature_categorias sfc 
    WHERE sfc.feature_id = sf.id
)
ORDER BY sf.name;

-- 5. VERIFICAR SE system_feature_categorias ESTÁ SENDO USADO
SELECT 
    'VERIFICAÇÃO system_feature_categorias' as tipo,
    sfc.feature_id,
    sf.name as funcionalidade,
    sfc.category_id,
    sc.name as categoria,
    sfc.sort_order
FROM system_feature_categorias sfc
JOIN system_features sf ON sfc.feature_id = sf.id
JOIN system_categorias sc ON sfc.category_id = sc.id
ORDER BY sf.name, sfc.sort_order;

-- 6. RESUMO PARA IMPLEMENTAÇÃO
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Categorias existentes: ' || (SELECT COUNT(*) FROM system_categorias) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Funcionalidades existentes: ' || (SELECT COUNT(*) FROM system_features) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Relacionamentos via system_feature_categorias: ' || (SELECT COUNT(*) FROM system_feature_categorias) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Funcionalidades com categoria direta: ' || (SELECT COUNT(*) FROM system_features WHERE category_id IS NOT NULL) as info;

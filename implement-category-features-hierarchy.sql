-- ========================================
-- IMPLEMENTAR HIERARQUIA CATEGORIA → FUNCIONALIDADES
-- ========================================
-- 
-- Este script implementa a visão correta:
-- - 1 Categoria = Múltiplas Funcionalidades
-- - Categorias = Agrupamento visual (sidebar)
-- - Funcionalidades = Permissões reais (RBAC)

-- 1. VER SITUAÇÃO ATUAL DAS CATEGORIAS
SELECT 
    'CATEGORIAS ATUAIS' as tipo,
    sc.id,
    sc.name as categoria,
    sc.slug,
    sc.description,
    COUNT(sf.id) as funcionalidades_vinculadas
FROM system_categorias sc
LEFT JOIN system_features sf ON sc.id = sf.category_id
GROUP BY sc.id, sc.name, sc.slug, sc.description
ORDER BY sc.name;

-- 2. VER FUNCIONALIDADES SEM CATEGORIA
SELECT 
    'FUNCIONALIDADES SEM CATEGORIA' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sf.description
FROM system_features sf
WHERE sf.category_id IS NULL
ORDER BY sf.name;

-- 3. VER FUNCIONALIDADES COM CATEGORIA
SELECT 
    'FUNCIONALIDADES COM CATEGORIA' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sf.category_id,
    sc.name as categoria,
    sc.slug as categoria_slug
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
WHERE sf.category_id IS NOT NULL
ORDER BY sc.name, sf.name;

-- 4. VERIFICAR SE system_feature_categorias ESTÁ SENDO USADO
SELECT 
    'VERIFICAÇÃO system_feature_categorias' as tipo,
    COUNT(*) as total_relacionamentos,
    COUNT(DISTINCT feature_id) as funcionalidades_diferentes,
    COUNT(DISTINCT category_id) as categorias_diferentes
FROM system_feature_categorias;

-- 5. MOSTRAR RELACIONAMENTOS VIA system_feature_categorias
SELECT 
    'RELACIONAMENTOS VIA system_feature_categorias' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sfc.category_id,
    sc.name as categoria,
    sfc.sort_order
FROM system_features sf
JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
JOIN system_categorias sc ON sfc.category_id = sc.id
ORDER BY sc.name, sfc.sort_order, sf.name;

-- 6. VERIFICAR INCONSISTÊNCIAS
SELECT 
    'INCONSISTÊNCIAS' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sf.category_id as categoria_direta,
    sfc.category_id as categoria_via_juncao,
    CASE 
        WHEN sf.category_id = sfc.category_id THEN 'CONSISTENTE'
        ELSE 'INCONSISTENTE'
    END as status
FROM system_features sf
JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
ORDER BY sf.name;

-- 7. RESUMO PARA IMPLEMENTAÇÃO
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
    'Funcionalidades com categoria direta: ' || (SELECT COUNT(*) FROM system_features WHERE category_id IS NOT NULL) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Relacionamentos via system_feature_categorias: ' || (SELECT COUNT(*) FROM system_feature_categorias) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Funcionalidades sem categoria: ' || (SELECT COUNT(*) FROM system_features WHERE category_id IS NULL) as info;


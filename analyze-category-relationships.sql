-- ========================================
-- ANALISAR RELACIONAMENTOS DE CATEGORIAS
-- ========================================
-- 
-- Este script analisa se system_feature_categorias é necessário
-- e padroniza para usar apenas system_features.category_id

-- 1. VER RELACIONAMENTOS DIRETOS (via category_id)
SELECT 
    'RELACIONAMENTOS DIRETOS' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sf.category_id,
    sc.name as categoria,
    sc.slug as categoria_slug
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
WHERE sf.category_id IS NOT NULL
ORDER BY sc.name, sf.name;

-- 2. VER RELACIONAMENTOS VIA system_feature_categorias
SELECT 
    'RELACIONAMENTOS VIA JUNÇÃO' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sfc.category_id,
    sc.name as categoria,
    sc.slug as categoria_slug,
    sfc.sort_order
FROM system_features sf
JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
JOIN system_categorias sc ON sfc.category_id = sc.id
ORDER BY sc.name, sfc.sort_order, sf.name;

-- 3. VER INCONSISTÊNCIAS ENTRE OS RELACIONAMENTOS
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

-- 4. VER FUNCIONALIDADES COM AMBOS OS RELACIONAMENTOS
SELECT 
    'FUNCIONALIDADES COM AMBOS' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sf.category_id as categoria_direta,
    sc1.name as categoria_direta_nome,
    sfc.category_id as categoria_via_juncao,
    sc2.name as categoria_via_juncao_nome
FROM system_features sf
JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
LEFT JOIN system_categorias sc1 ON sf.category_id = sc1.id
LEFT JOIN system_categorias sc2 ON sfc.category_id = sc2.id
WHERE sf.category_id IS NOT NULL
ORDER BY sf.name;

-- 5. VER FUNCIONALIDADES APENAS COM RELACIONAMENTO DIRETO
SELECT 
    'APENAS DIRETO' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sf.category_id,
    sc.name as categoria
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
WHERE sf.category_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM system_feature_categorias sfc 
    WHERE sfc.feature_id = sf.id
)
ORDER BY sc.name, sf.name;

-- 6. VER FUNCIONALIDADES APENAS COM RELACIONAMENTO VIA JUNÇÃO
SELECT 
    'APENAS VIA JUNÇÃO' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sfc.category_id,
    sc.name as categoria
FROM system_features sf
JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
JOIN system_categorias sc ON sfc.category_id = sc.id
WHERE sf.category_id IS NULL
ORDER BY sc.name, sf.name;

-- 7. VER FUNCIONALIDADES SEM CATEGORIA
SELECT 
    'SEM CATEGORIA' as tipo,
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

-- 8. RESUMO PARA DECISÃO
SELECT 
    'RESUMO PARA DECISÃO' as tipo,
    'Funcionalidades com relacionamento direto: ' || (SELECT COUNT(*) FROM system_features WHERE category_id IS NOT NULL) as info
UNION ALL
SELECT 
    'RESUMO PARA DECISÃO' as tipo,
    'Funcionalidades via system_feature_categorias: ' || (SELECT COUNT(*) FROM system_feature_categorias) as info
UNION ALL
SELECT 
    'RESUMO PARA DECISÃO' as tipo,
    'Funcionalidades com ambos os relacionamentos: ' || (SELECT COUNT(*) FROM system_features sf WHERE sf.category_id IS NOT NULL AND EXISTS (SELECT 1 FROM system_feature_categorias sfc WHERE sfc.feature_id = sf.id)) as info
UNION ALL
SELECT 
    'RESUMO PARA DECISÃO' as tipo,
    'Funcionalidades sem categoria: ' || (SELECT COUNT(*) FROM system_features WHERE category_id IS NULL AND NOT EXISTS (SELECT 1 FROM system_feature_categorias sfc WHERE sfc.feature_id = system_features.id)) as info;

-- ========================================
-- PADRONIZAR USO DAS CATEGORIAS
-- ========================================
-- 
-- Este script descobre como está sendo usado e sugere padronização

-- 1. VER RELACIONAMENTOS DIRETOS (via category_id)
SELECT 
    'RELACIONAMENTOS DIRETOS' as tipo,
    COUNT(*) as total,
    COUNT(DISTINCT sf.category_id) as categorias_diferentes
FROM system_features sf
WHERE sf.category_id IS NOT NULL;

-- 2. VER RELACIONAMENTOS VIA JUNÇÃO
SELECT 
    'RELACIONAMENTOS VIA JUNÇÃO' as tipo,
    COUNT(*) as total,
    COUNT(DISTINCT sfc.category_id) as categorias_diferentes
FROM system_features sf
JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id;

-- 3. VER FEATURES SEM CATEGORIA
SELECT 
    'FEATURES SEM CATEGORIA' as tipo,
    COUNT(*) as total
FROM system_features sf
WHERE sf.category_id IS NULL
AND NOT EXISTS (
    SELECT 1 FROM system_feature_categorias sfc 
    WHERE sfc.feature_id = sf.id
);

-- 4. VER FEATURES COM AMBOS OS RELACIONAMENTOS
SELECT 
    'FEATURES COM AMBOS' as tipo,
    COUNT(*) as total
FROM system_features sf
WHERE sf.category_id IS NOT NULL
AND EXISTS (
    SELECT 1 FROM system_feature_categorias sfc 
    WHERE sfc.feature_id = sf.id
);

-- 5. VER FEATURES APENAS COM RELACIONAMENTO DIRETO
SELECT 
    'APENAS DIRETO' as tipo,
    COUNT(*) as total
FROM system_features sf
WHERE sf.category_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM system_feature_categorias sfc 
    WHERE sfc.feature_id = sf.id
);

-- 6. VER FEATURES APENAS COM RELACIONAMENTO VIA JUNÇÃO
SELECT 
    'APENAS VIA JUNÇÃO' as tipo,
    COUNT(*) as total
FROM system_features sf
WHERE sf.category_id IS NULL
AND EXISTS (
    SELECT 1 FROM system_feature_categorias sfc 
    WHERE sfc.feature_id = sf.id
);

-- 7. MOSTRAR EXEMPLOS DE CADA TIPO
SELECT 
    'EXEMPLO: DIRETO' as tipo,
    sf.id,
    sf.name,
    sf.category_id,
    sc.name as categoria_name
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
WHERE sf.category_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM system_feature_categorias sfc 
    WHERE sfc.feature_id = sf.id
)
LIMIT 3;

-- 8. MOSTRAR EXEMPLOS VIA JUNÇÃO
SELECT 
    'EXEMPLO: VIA JUNÇÃO' as tipo,
    sf.id,
    sf.name,
    sfc.category_id,
    sc.name as categoria_name
FROM system_features sf
JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
JOIN system_categorias sc ON sfc.category_id = sc.id
LIMIT 3;

-- 9. RESUMO PARA DECISÃO
SELECT 
    'RESUMO PARA DECISÃO' as tipo,
    'Relacionamento direto é mais simples' as recomendacao,
    'Remover system_feature_categorias se não for necessário' as acao
UNION ALL
SELECT 
    'RESUMO PARA DECISÃO' as tipo,
    'Relacionamento via junção permite múltiplas categorias' as recomendacao,
    'Manter system_feature_categorias se features precisam de múltiplas categorias' as acao;

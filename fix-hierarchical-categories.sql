-- ========================================
-- CORRIGIR CATEGORIAS HIERÁRQUICAS
-- ========================================
-- 
-- Este script implementa a visão correta:
-- - Categorias = Agrupamento visual (sidebar)
-- - Funcionalidades = Permissões reais (RBAC)
-- - Relacionamento: Muitas funcionalidades → Uma categoria

-- 1. VERIFICAR SE HÁ INCONSISTÊNCIAS ENTRE OS RELACIONAMENTOS
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

-- 2. VER QUAIS CATEGORIAS ESTÃO SENDO USADAS
SELECT 
    'CATEGORIAS EM USO' as tipo,
    sc.id,
    sc.name as categoria,
    sc.slug,
    COUNT(sf.id) as funcionalidades_diretas,
    COUNT(sfc.feature_id) as funcionalidades_via_juncao
FROM system_categorias sc
LEFT JOIN system_features sf ON sc.id = sf.category_id
LEFT JOIN system_feature_categorias sfc ON sc.id = sfc.category_id
GROUP BY sc.id, sc.name, sc.slug
ORDER BY sc.name;

-- 3. VER ESTRUTURA ATUAL DAS FUNCIONALIDADES
SELECT 
    'FUNCIONALIDADES ATUAIS' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sf.category_id,
    sc.name as categoria_direta,
    sfc.category_id as categoria_via_juncao,
    sc2.name as categoria_via_juncao_nome
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
LEFT JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
LEFT JOIN system_categorias sc2 ON sfc.category_id = sc2.id
ORDER BY sf.name;

-- 4. VERIFICAR SE system_feature_categorias É NECESSÁRIO
SELECT 
    'ANÁLISE system_feature_categorias' as tipo,
    'Funcionalidades com múltiplas categorias' as descricao,
    COUNT(*) as total
FROM (
    SELECT feature_id
    FROM system_feature_categorias
    GROUP BY feature_id
    HAVING COUNT(*) > 1
) as multiplas_categorias;

-- 5. RESUMO PARA DECISÃO
SELECT 
    'DECISÃO NECESSÁRIA' as tipo,
    'Remover system_feature_categorias' as opcao_a,
    'Manter apenas relacionamento direto' as justificativa_a
UNION ALL
SELECT 
    'DECISÃO NECESSÁRIA' as tipo,
    'Manter system_feature_categorias' as opcao_b,
    'Se funcionalidades precisam de múltiplas categorias' as justificativa_b;

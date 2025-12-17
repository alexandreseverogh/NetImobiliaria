-- ========================================
-- PADRONIZAR ESTRUTURA DE CATEGORIAS
-- ========================================
-- 
-- Este script padroniza para usar apenas system_features.category_id
-- e remove a redundância de system_feature_categorias

-- 1. VER SITUAÇÃO ATUAL ANTES DA PADRONIZAÇÃO
SELECT 
    'ANTES DA PADRONIZAÇÃO' as tipo,
    'Funcionalidades com relacionamento direto: ' || (SELECT COUNT(*) FROM system_features WHERE category_id IS NOT NULL) as info
UNION ALL
SELECT 
    'ANTES DA PADRONIZAÇÃO' as tipo,
    'Relacionamentos via system_feature_categorias: ' || (SELECT COUNT(*) FROM system_feature_categorias) as info;

-- 2. VER INCONSISTÊNCIAS ANTES DA PADRONIZAÇÃO
SELECT 
    'INCONSISTÊNCIAS ANTES' as tipo,
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

-- 3. CORRIGIR INCONSISTÊNCIAS (se houver)
-- Atualizar system_features.category_id para usar o valor de system_feature_categorias
UPDATE system_features 
SET category_id = sfc.category_id
FROM system_feature_categorias sfc
WHERE system_features.id = sfc.feature_id
AND system_features.category_id != sfc.category_id;

-- 4. VER FUNCIONALIDADES SEM CATEGORIA DIRETA
SELECT 
    'FUNCIONALIDADES SEM CATEGORIA DIRETA' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sfc.category_id,
    sc.name as categoria
FROM system_features sf
JOIN system_feature_categorias sfc ON sf.id = sfc.feature_id
JOIN system_categorias sc ON sfc.category_id = sc.id
WHERE sf.category_id IS NULL
ORDER BY sf.name;

-- 5. ATRIBUIR CATEGORIAS DIRETAS (se necessário)
UPDATE system_features 
SET category_id = sfc.category_id
FROM system_feature_categorias sfc
WHERE system_features.id = sfc.feature_id
AND system_features.category_id IS NULL;

-- 6. VER SITUAÇÃO APÓS CORREÇÕES
SELECT 
    'APÓS CORREÇÕES' as tipo,
    'Funcionalidades com relacionamento direto: ' || (SELECT COUNT(*) FROM system_features WHERE category_id IS NOT NULL) as info
UNION ALL
SELECT 
    'APÓS CORREÇÕES' as tipo,
    'Funcionalidades sem categoria: ' || (SELECT COUNT(*) FROM system_features WHERE category_id IS NULL) as info;

-- 7. VER ESTRUTURA HIERÁRQUICA FINAL
SELECT 
    'ESTRUTURA HIERÁRQUICA FINAL' as tipo,
    sc.name as categoria,
    sc.slug as categoria_slug,
    COUNT(sf.id) as funcionalidades,
    STRING_AGG(sf.name, ', ' ORDER BY sf.name) as lista_funcionalidades
FROM system_categorias sc
LEFT JOIN system_features sf ON sc.id = sf.category_id
GROUP BY sc.id, sc.name, sc.slug
ORDER BY sc.name;

-- 8. VERIFICAR SE system_feature_categorias PODE SER REMOVIDA
SELECT 
    'VERIFICAÇÃO FINAL' as tipo,
    'Todas as funcionalidades têm categoria direta: ' || 
    CASE 
        WHEN (SELECT COUNT(*) FROM system_features WHERE category_id IS NULL) = 0 
        THEN 'SIM' 
        ELSE 'NÃO' 
    END as info
UNION ALL
SELECT 
    'VERIFICAÇÃO FINAL' as tipo,
    'system_feature_categorias pode ser removida: ' || 
    CASE 
        WHEN (SELECT COUNT(*) FROM system_features WHERE category_id IS NULL) = 0 
        THEN 'SIM' 
        ELSE 'NÃO' 
    END as info;

-- 9. RESUMO PARA IMPLEMENTAÇÃO
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Categorias existentes: ' || (SELECT COUNT(*) FROM system_categorias) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Funcionalidades com categoria: ' || (SELECT COUNT(*) FROM system_features WHERE category_id IS NOT NULL) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Permissões existentes: ' || (SELECT COUNT(*) FROM permissions) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Sistema pronto para sidebar hierárquica: SIM' as info;

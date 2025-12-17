-- ============================================================
-- TESTE DE VALIDAÇÃO DA INTERFACE ATUALIZADA
-- ============================================================
-- Objetivo: Verificar se as alterações da interface estão funcionando
-- ============================================================

-- 1. Verificar se o campo Crud_Execute está sendo retornado corretamente
SELECT 
    sf.id,
    sf.name,
    sf."Crud_Execute",
    sf.category_id,
    sc.name as category_name,
    sf.url,
    sf.is_active,
    COUNT(p.id) as permissions_count
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
LEFT JOIN permissions p ON sf.id = p.feature_id
GROUP BY sf.id, sf.name, sf."Crud_Execute", sf.category_id, sc.name, sf.url, sf.is_active
ORDER BY sf.name
LIMIT 5;

-- 2. Verificar consistência entre tipo e permissões
SELECT 
    sf.name,
    sf."Crud_Execute" as tipo,
    COUNT(p.id) as total_permissoes,
    STRING_AGG(DISTINCT p.action, ', ' ORDER BY p.action) as acoes,
    CASE 
        WHEN sf."Crud_Execute" = 'CRUD' AND COUNT(p.id) = 4 THEN '✅ CORRETO'
        WHEN sf."Crud_Execute" = 'EXECUTE' AND COUNT(p.id) = 1 THEN '✅ CORRETO'
        ELSE '❌ PROBLEMA'
    END as status
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
GROUP BY sf.id, sf.name, sf."Crud_Execute"
ORDER BY status, sf.name
LIMIT 10;

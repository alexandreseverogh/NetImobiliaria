-- Verificar todas as funcionalidades CRUD para confirmar que têm 4 permissões
SELECT 
    sf.id,
    sf.name,
    sf."Crud_Execute",
    COUNT(p.id) as total_permissoes,
    STRING_AGG(DISTINCT p.action, ', ' ORDER BY p.action) as acoes,
    CASE 
        WHEN COUNT(p.id) = 4 THEN '✅ CORRETO'
        ELSE '❌ PROBLEMA'
    END as status
FROM system_features sf 
LEFT JOIN permissions p ON sf.id = p.feature_id 
WHERE sf."Crud_Execute" = 'CRUD'
GROUP BY sf.id, sf.name, sf."Crud_Execute"
ORDER BY sf.name;

-- Verificar se há funcionalidades duplicadas
SELECT 
    name,
    COUNT(*) as quantidade,
    STRING_AGG(id::text, ', ') as ids
FROM system_features
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY name;

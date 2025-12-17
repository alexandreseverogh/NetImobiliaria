-- ============================================================
-- RESUMO ESTATÍSTICO CORRIGIDO
-- ============================================================
SELECT 
    'Total de funcionalidades' as metrica,
    COUNT(*) as valor
FROM system_features
UNION ALL
SELECT 
    'Funcionalidades CRUD' as metrica,
    COUNT(*) as valor
FROM system_features WHERE "Crud_Execute" = 'CRUD'
UNION ALL
SELECT 
    'Funcionalidades EXECUTE' as metrica,
    COUNT(*) as valor
FROM system_features WHERE "Crud_Execute" = 'EXECUTE'
UNION ALL
SELECT 
    'Funcionalidades sem tipo' as metrica,
    COUNT(*) as valor
FROM system_features WHERE "Crud_Execute" IS NULL
UNION ALL
SELECT 
    'Total de permissões' as metrica,
    COUNT(*) as valor
FROM permissions
UNION ALL
SELECT 
    'Funcionalidades EXECUTE com múltiplas permissões' as metrica,
    COUNT(*) as valor
FROM (
    SELECT sf.id
    FROM system_features sf
    LEFT JOIN permissions p ON sf.id = p.feature_id
    WHERE sf."Crud_Execute" = 'EXECUTE'
    GROUP BY sf.id
    HAVING COUNT(p.id) > 1
) as problematicas_execute
UNION ALL
SELECT 
    'Funcionalidades CRUD com quantidade incorreta' as metrica,
    COUNT(*) as valor
FROM (
    SELECT sf.id
    FROM system_features sf
    LEFT JOIN permissions p ON sf.id = p.feature_id
    WHERE sf."Crud_Execute" = 'CRUD'
    GROUP BY sf.id
    HAVING COUNT(p.id) != 4
) as problematicas_crud;

-- ============================================================
-- AJUSTE FINAL: REMOVER PERMISSÕES ADMIN DESNECESSÁRIAS
-- ============================================================
-- Objetivo: Manter apenas CREATE/READ/UPDATE/DELETE para CRUD
-- ============================================================

-- Backup antes do ajuste final
CREATE TABLE IF NOT EXISTS permissions_backup_final_$(Get-Date -Format 'yyyyMMdd_HHmmss') AS 
SELECT * FROM permissions;

-- Remover permissões ADMIN de funcionalidades CRUD
DELETE FROM permissions 
WHERE id IN (
    SELECT p.id
    FROM permissions p
    JOIN system_features sf ON p.feature_id = sf.id
    WHERE sf."Crud_Execute" = 'CRUD'
    AND p.action = 'ADMIN'
);

-- Verificar resultado final
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
ORDER BY status, sf.name;

-- Resumo final
SELECT 
    'Total de funcionalidades' as metrica,
    COUNT(*) as valor
FROM system_features
UNION ALL
SELECT 
    'Funcionalidades CRUD corretas' as metrica,
    COUNT(*) as valor
FROM (
    SELECT sf.id
    FROM system_features sf
    LEFT JOIN permissions p ON sf.id = p.feature_id
    WHERE sf."Crud_Execute" = 'CRUD'
    GROUP BY sf.id
    HAVING COUNT(p.id) = 4
) as crud_corretas
UNION ALL
SELECT 
    'Funcionalidades EXECUTE corretas' as metrica,
    COUNT(*) as valor
FROM (
    SELECT sf.id
    FROM system_features sf
    LEFT JOIN permissions p ON sf.id = p.feature_id
    WHERE sf."Crud_Execute" = 'EXECUTE'
    GROUP BY sf.id
    HAVING COUNT(p.id) = 1
) as execute_corretas;

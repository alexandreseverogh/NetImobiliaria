-- ============================================================
-- PLANO DE AÇÃO PARA MELHORIA DA PÁGINA DE PERMISSÕES
-- ============================================================
-- ANÁLISE DETALHADA E SOLUÇÕES PROPOSTAS
-- ============================================================

-- ============================================================
-- 1. IDENTIFICAR FUNCIONALIDADES COM TYPE INCORRETO
-- ============================================================
-- Objetivo: Encontrar funcionalidades EXECUTE que têm CRUD registrado

SELECT 
    sf.id as feature_id,
    sf.name as feature_name,
    sf."Crud_Execute" as type,
    COUNT(p.id) as total_permissions,
    STRING_AGG(DISTINCT p.action, ', ' ORDER BY p.action) as actions
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf."Crud_Execute" = 'EXECUTE'
GROUP BY sf.id, sf.name, sf."Crud_Execute"
HAVING COUNT(p.id) > 1 OR COUNT(DISTINCT p.action) > 1
ORDER BY sf.name;

-- ============================================================
-- 2. IDENTIFICAR FUNCIONALIDADES CRUD SEM PERMISSÕES CORRETAS
-- ============================================================
-- Objetivo: Verificar se funcionalidades CRUD têm permissões adequadas

SELECT 
    sf.id as feature_id,
    sf.name as feature_name,
    sf."Crud_Execute" as type,
    COUNT(p.id) as total_permissions,
    STRING_AGG(DISTINCT p.action, ', ' ORDER BY p.action) as actions
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf."Crud_Execute" = 'CRUD'
GROUP BY sf.id, sf.name, sf."Crud_Execute"
ORDER BY sf.name;

-- ============================================================
-- 3. LISTAR TODAS AS PERMISSÕES INCORRETAS PARA EXECUTE
-- ============================================================
-- Objetivo: Identificar registros que precisam ser removidos

SELECT 
    p.id as permission_id,
    sf.name as feature_name,
    sf."Crud_Execute" as type,
    p.action,
    p.description
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf."Crud_Execute" = 'EXECUTE' 
AND p.action NOT IN ('EXECUTE', 'admin', 'ADMIN')
ORDER BY sf.name, p.action;

-- ============================================================
-- 4. SUMÁRIO DE PROBLEMAS IDENTIFICADOS
-- ============================================================
SELECT 
    'Total de funcionalidades EXECUTE' as metric,
    COUNT(*) as value
FROM system_features WHERE "Crud_Execute" = 'EXECUTE'
UNION ALL
SELECT 
    'Total de funcionalidades CRUD' as metric,
    COUNT(*) as value
FROM system_features WHERE "Crud_Execute" = 'CRUD'
UNION ALL
SELECT 
    'Funcionalidades EXECUTE com permissões incorretas' as metric,
    COUNT(DISTINCT sf.id) as value
FROM system_features sf
JOIN permissions p ON sf.id = p.feature_id
WHERE sf."Crud_Execute" = 'EXECUTE' 
AND p.action NOT IN ('EXECUTE', 'admin', 'ADMIN')
UNION ALL
SELECT 
    'Registros de permissões que precisam ser removidos' as metric,
    COUNT(*) as value
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf."Crud_Execute" = 'EXECUTE' 
AND p.action NOT IN ('EXECUTE', 'admin', 'ADMIN');

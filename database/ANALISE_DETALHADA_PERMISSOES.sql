-- ============================================================
-- SCRIPT DE ANÁLISE DETALHADA DAS PERMISSÕES
-- ============================================================
-- Objetivo: Identificar todos os problemas de inconsistência
-- ============================================================

-- 1. ANÁLISE GERAL - Status de cada funcionalidade
SELECT 
    sf.id,
    sf.name as funcionalidade,
    sf."Crud_Execute" as tipo_esperado,
    COUNT(p.id) as total_permissoes,
    STRING_AGG(DISTINCT p.action, ', ' ORDER BY p.action) as acoes_existentes,
    CASE 
        WHEN sf."Crud_Execute" = 'EXECUTE' AND COUNT(p.id) = 0 THEN '❌ SEM PERMISSÕES'
        WHEN sf."Crud_Execute" = 'EXECUTE' AND COUNT(p.id) = 1 AND STRING_AGG(DISTINCT p.action, ', ') = 'EXECUTE' THEN '✅ CORRETO'
        WHEN sf."Crud_Execute" = 'EXECUTE' AND COUNT(p.id) = 1 AND STRING_AGG(DISTINCT p.action, ', ') = 'ADMIN' THEN '⚠️ ADMIN (aceitável)'
        WHEN sf."Crud_Execute" = 'EXECUTE' AND COUNT(p.id) > 1 THEN '❌ MÚLTIPLAS PERMISSÕES'
        WHEN sf."Crud_Execute" = 'CRUD' AND COUNT(p.id) = 0 THEN '❌ SEM PERMISSÕES'
        WHEN sf."Crud_Execute" = 'CRUD' AND COUNT(p.id) = 4 AND 
             STRING_AGG(DISTINCT p.action, ', ') LIKE '%CREATE%' AND
             STRING_AGG(DISTINCT p.action, ', ') LIKE '%READ%' AND
             STRING_AGG(DISTINCT p.action, ', ') LIKE '%UPDATE%' AND
             STRING_AGG(DISTINCT p.action, ', ') LIKE '%DELETE%' THEN '✅ CORRETO'
        WHEN sf."Crud_Execute" = 'CRUD' AND COUNT(p.id) != 4 THEN '❌ QUANTIDADE INCORRETA'
        WHEN sf."Crud_Execute" IS NULL THEN '❌ TIPO NÃO DEFINIDO'
        ELSE '❌ INCONSISTENTE'
    END as status
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
GROUP BY sf.id, sf.name, sf."Crud_Execute"
ORDER BY 
    CASE 
        WHEN sf."Crud_Execute" = 'EXECUTE' AND COUNT(p.id) > 1 THEN 1
        WHEN sf."Crud_Execute" = 'CRUD' AND COUNT(p.id) != 4 THEN 2
        WHEN sf."Crud_Execute" IS NULL THEN 3
        ELSE 4
    END,
    sf.name;

-- ============================================================
-- 2. FUNCIONALIDADES EXECUTE COM PROBLEMAS
-- ============================================================
SELECT 
    sf.id,
    sf.name,
    sf."Crud_Execute",
    COUNT(p.id) as total_permissoes,
    STRING_AGG(DISTINCT p.action, ', ' ORDER BY p.action) as acoes_problematicas
FROM system_features sf
JOIN permissions p ON sf.id = p.feature_id
WHERE sf."Crud_Execute" = 'EXECUTE'
GROUP BY sf.id, sf.name, sf."Crud_Execute"
HAVING COUNT(p.id) > 1 OR STRING_AGG(DISTINCT p.action, ', ') NOT LIKE '%EXECUTE%'
ORDER BY sf.name;

-- ============================================================
-- 3. FUNCIONALIDADES CRUD COM PROBLEMAS
-- ============================================================
SELECT 
    sf.id,
    sf.name,
    sf."Crud_Execute",
    COUNT(p.id) as total_permissoes,
    STRING_AGG(DISTINCT p.action, ', ' ORDER BY p.action) as acoes_existentes,
    CASE 
        WHEN COUNT(p.id) < 4 THEN 'FALTANDO PERMISSÕES'
        WHEN COUNT(p.id) > 4 THEN 'PERMISSÕES EXCESSIVAS'
        ELSE 'PERMISSÕES INCORRETAS'
    END as problema
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf."Crud_Execute" = 'CRUD'
GROUP BY sf.id, sf.name, sf."Crud_Execute"
HAVING COUNT(p.id) != 4 OR 
       NOT (STRING_AGG(DISTINCT p.action, ', ') LIKE '%CREATE%' AND
            STRING_AGG(DISTINCT p.action, ', ') LIKE '%READ%' AND
            STRING_AGG(DISTINCT p.action, ', ') LIKE '%UPDATE%' AND
            STRING_AGG(DISTINCT p.action, ', ') LIKE '%DELETE%')
ORDER BY sf.name;

-- ============================================================
-- 4. PERMISSÕES DUPLICADAS
-- ============================================================
SELECT 
    sf.name as funcionalidade,
    p.action,
    COUNT(*) as quantidade,
    STRING_AGG(p.id::text, ', ') as ids_duplicados
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
GROUP BY sf.name, p.action, sf.id
HAVING COUNT(*) > 1
ORDER BY sf.name, p.action;

-- ============================================================
-- 5. FUNCIONALIDADES SEM TIPO DEFINIDO
-- ============================================================
SELECT 
    id,
    name,
    "Crud_Execute",
    CASE 
        WHEN "Crud_Execute" IS NULL THEN 'TIPO NÃO DEFINIDO'
        WHEN "Crud_Execute" NOT IN ('CRUD', 'EXECUTE') THEN 'TIPO INVÁLIDO'
        ELSE 'OK'
    END as problema
FROM system_features
WHERE "Crud_Execute" IS NULL OR "Crud_Execute" NOT IN ('CRUD', 'EXECUTE')
ORDER BY name;

-- ============================================================
-- 6. RESUMO ESTATÍSTICO
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
    'Funcionalidades com problemas' as metrica,
    COUNT(DISTINCT sf.id) as valor
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE (sf."Crud_Execute" = 'EXECUTE' AND COUNT(p.id) > 1)
   OR (sf."Crud_Execute" = 'CRUD' AND COUNT(p.id) != 4)
GROUP BY sf.id
HAVING COUNT(DISTINCT sf.id) > 0;

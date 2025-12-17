-- Script de Diagnóstico COMPLETO: Por que Receitas de Destaques não aparece no menu
-- Execute este script e envie TODOS os resultados

-- ============================================
-- ETAPA 1: Verificar funcionalidade
-- ============================================
SELECT 
    '=== ETAPA 1: FUNCIONALIDADE ===' as etapa,
    sf.id,
    sf.name,
    sf.slug,
    sf.category_id,
    sf.is_active,
    sf."Crud_Execute",
    sf.url,
    sc.name as categoria_nome,
    sc.slug as categoria_slug,
    sc.is_active as categoria_ativa
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
WHERE sf.id = 57 OR sf.slug = 'receitas-destaques';

-- ============================================
-- ETAPA 2: Verificar permissões
-- ============================================
SELECT 
    '=== ETAPA 2: PERMISSÕES ===' as etapa,
    p.id,
    p.feature_id,
    p.action,
    p.description
FROM permissions p
WHERE p.feature_id = 57;

-- ============================================
-- ETAPA 3: Verificar role_permissions
-- ============================================
SELECT 
    '=== ETAPA 3: ROLE_PERMISSIONS ===' as etapa,
    rp.id,
    rp.role_id,
    rp.permission_id,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'role_permissions' AND column_name = 'is_active'
        ) THEN (SELECT is_active FROM role_permissions WHERE id = rp.id)
        ELSE true
    END as is_active,
    ur.name as role_name,
    ur.is_active as role_ativa,
    p.action as permission_action
FROM role_permissions rp
JOIN user_roles ur ON rp.role_id = ur.id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.feature_id = 57;

-- ============================================
-- ETAPA 4: Verificar usuário admin
-- ============================================
SELECT 
    '=== ETAPA 4: USUÁRIO ADMIN ===' as etapa,
    u.id,
    u.username,
    u.email,
    u.is_active as usuario_ativo
FROM users u
WHERE u.username = 'admin';

-- ============================================
-- ETAPA 5: Verificar user_role_assignments do admin
-- ============================================
SELECT 
    '=== ETAPA 5: USER_ROLE_ASSIGNMENTS (ADMIN) ===' as etapa,
    u.id as user_id,
    u.username,
    ura.id as ura_id,
    ura.role_id,
    ura.is_active as ura_ativo,
    ur.name as role_name,
    ur.is_active as role_ativa
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin';

-- ============================================
-- ETAPA 6: SIMULAR QUERY DA API (PASSO A PASSO)
-- ============================================

-- 6.1: Verificar se funcionalidade está ativa
SELECT 
    '=== ETAPA 6.1: FUNCIONALIDADE ATIVA? ===' as etapa,
    sf.id,
    sf.name,
    sf.is_active,
    CASE WHEN sf.is_active = true THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
FROM system_features sf
WHERE sf.id = 57;

-- 6.2: Verificar se tem category_id
SELECT 
    '=== ETAPA 6.2: TEM CATEGORY_ID? ===' as etapa,
    sf.id,
    sf.name,
    sf.category_id,
    sc.name as categoria,
    CASE WHEN sf.category_id IS NOT NULL THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
WHERE sf.id = 57;

-- 6.3: Verificar se tem permissão execute
SELECT 
    '=== ETAPA 6.3: TEM PERMISSÃO EXECUTE? ===' as etapa,
    p.id,
    p.feature_id,
    p.action,
    CASE WHEN p.action = 'execute' THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
FROM permissions p
WHERE p.feature_id = 57 AND p.action = 'execute';

-- 6.4: Verificar se role_permissions está ativo
SELECT 
    '=== ETAPA 6.4: ROLE_PERMISSIONS ATIVO? ===' as etapa,
    rp.id,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'role_permissions' AND column_name = 'is_active'
        ) THEN (SELECT is_active FROM role_permissions WHERE id = rp.id)
        ELSE true
    END as is_active,
    ur.name as role,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'role_permissions' AND column_name = 'is_active'
        ) THEN 
            CASE WHEN (SELECT is_active FROM role_permissions WHERE id = rp.id) = true THEN '✅ SIM' ELSE '❌ NÃO' END
        ELSE '✅ SIM (coluna não existe, assumindo true)'
    END as resultado
FROM role_permissions rp
JOIN user_roles ur ON rp.role_id = ur.id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.feature_id = 57
AND ur.name IN ('Super Admin', 'Administrador');

-- 6.5: Verificar se user_role_assignments está ativo para admin
SELECT 
    '=== ETAPA 6.5: USER_ROLE_ASSIGNMENTS ATIVO PARA ADMIN? ===' as etapa,
    u.username,
    ura.is_active as ura_ativo,
    ur.name as role,
    CASE WHEN ura.is_active = true THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin'
AND ur.name IN ('Super Admin', 'Administrador');

-- ============================================
-- ETAPA 7: QUERY COMPLETA DA API (SIMULAÇÃO)
-- ============================================
SELECT 
    '=== ETAPA 7: QUERY COMPLETA DA API ===' as etapa,
    sf.id,
    sf.name,
    sf.category_id,
    sc.name as category_name,
    sc.slug as category_slug,
    p.action,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'role_permissions' AND column_name = 'is_active'
        ) THEN (SELECT is_active FROM role_permissions WHERE id = rp.id)
        ELSE true
    END as rp_ativo,
    ura.is_active as ura_ativo,
    u.username,
    CASE 
        WHEN sf.is_active = true 
        AND sf.category_id IS NOT NULL
        AND p.action = 'execute'
        AND (
            NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'role_permissions' AND column_name = 'is_active'
            ) OR (SELECT is_active FROM role_permissions WHERE id = rp.id) = true
        )
        AND ura.is_active = true 
        THEN '✅ DEVE APARECER'
        ELSE '❌ NÃO DEVE APARECER - VERIFICAR ETAPAS ANTERIORES'
    END as resultado
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
JOIN permissions p ON sf.id = p.feature_id
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN user_role_assignments ura ON rp.role_id = ura.role_id
JOIN users u ON ura.user_id = u.id
WHERE u.username = 'admin'
AND sf.id = 57
AND p.action = 'execute';

-- ============================================
-- ETAPA 8: Verificar todas as funcionalidades que o admin TEM acesso
-- ============================================
SELECT 
    '=== ETAPA 8: TODAS AS FUNCIONALIDADES DO ADMIN ===' as etapa,
    sf.id,
    sf.name,
    sf.category_id,
    sc.name as categoria,
    COUNT(*) as total_permissoes
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
JOIN permissions p ON sf.id = p.feature_id
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN user_role_assignments ura ON rp.role_id = ura.role_id
JOIN users u ON ura.user_id = u.id
WHERE u.username = 'admin'
AND sf.is_active = true
AND (
    NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'role_permissions' AND column_name = 'is_active'
    ) OR (SELECT is_active FROM role_permissions WHERE id = rp.id) = true
)
AND ura.is_active = true
GROUP BY sf.id, sf.name, sf.category_id, sc.name
ORDER BY sc.name, sf.name;


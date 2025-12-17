-- Script de Diagnóstico FINAL: Por que Receitas de Destaques não aparece no menu
-- Versão simplificada sem verificações complexas de colunas

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
    sc.is_active as categoria_ativa,
    CASE 
        WHEN sf.is_active = true AND sf.category_id IS NOT NULL THEN '✅ OK'
        WHEN sf.is_active = false THEN '❌ FUNCIONALIDADE INATIVA'
        WHEN sf.category_id IS NULL THEN '❌ SEM CATEGORIA'
        ELSE '❌ PROBLEMA'
    END as status
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
    p.description,
    CASE 
        WHEN p.action = 'execute' THEN '✅ OK'
        ELSE '❌ PERMISSÃO ERRADA'
    END as status
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
    ur.name as role_name,
    ur.is_active as role_ativa,
    p.action as permission_action,
    CASE 
        WHEN ur.is_active = true THEN '✅ ROLE ATIVA'
        ELSE '❌ ROLE INATIVA'
    END as status
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
    '✅ USUÁRIO ENCONTRADO' as status
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
    ur.name as role_name,
    ur.is_active as role_ativa,
    CASE 
        WHEN ur.is_active = true THEN '✅ OK'
        WHEN ur.is_active = false THEN '❌ ROLE INATIVA'
        ELSE '❌ PROBLEMA'
    END as status
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin'
AND ur.name IN ('Super Admin', 'Administrador');

-- ============================================
-- ETAPA 6: SIMULAÇÃO DA QUERY DA API (SIMPLIFICADA)
-- ============================================
SELECT 
    '=== ETAPA 6: SIMULAÇÃO QUERY API ===' as etapa,
    sf.id,
    sf.name,
    sf.category_id,
    sc.name as category_name,
    p.action,
    u.username,
    CASE 
        WHEN sf.is_active = true 
        AND sf.category_id IS NOT NULL
        AND p.action = 'execute'
        AND ur.is_active = true
        THEN '✅ DEVE APARECER NO MENU'
        ELSE '❌ NÃO DEVE APARECER'
    END as resultado
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
JOIN permissions p ON sf.id = p.feature_id AND p.action = 'execute'
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN user_role_assignments ura ON rp.role_id = ura.role_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN users u ON ura.user_id = u.id
WHERE u.username = 'admin'
AND sf.id = 57;

-- ============================================
-- ETAPA 7: Verificar todas as funcionalidades que o admin TEM acesso
-- ============================================
SELECT 
    '=== ETAPA 7: TODAS AS FUNCIONALIDADES DO ADMIN ===' as etapa,
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
JOIN user_roles ur ON ura.role_id = ur.id
JOIN users u ON ura.user_id = u.id
WHERE u.username = 'admin'
AND sf.is_active = true
AND ur.is_active = true
GROUP BY sf.id, sf.name, sf.category_id, sc.name
ORDER BY sc.name, sf.name;


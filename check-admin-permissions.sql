-- ========================================
-- VERIFICAR PERMISSÕES DO USUÁRIO ADMIN
-- ========================================
-- 
-- Este script verifica as permissões do usuário admin

-- 1. VERIFICAR USUÁRIO ADMIN
SELECT 
    'USUÁRIO ADMIN' as tipo,
    u.id,
    u.username,
    u.email,
    u.ativo
FROM users u
WHERE u.username = 'admin';

-- 2. VERIFICAR ROLES DO USUÁRIO ADMIN
SELECT 
    'ROLES DO ADMIN' as tipo,
    u.username,
    ur.name as role_name,
    ur.level,
    ur.is_active as role_active,
    ura.assigned_at
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin';

-- 3. VERIFICAR PERMISSÕES DO ROLE SUPER ADMIN
SELECT 
    'PERMISSÕES SUPER ADMIN' as tipo,
    ur.name as role_name,
    sf.name as funcionalidade,
    p.action,
    p.description
FROM user_roles ur
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Super Admin'
ORDER BY sf.name, p.action;

-- 4. VERIFICAR SE EXISTE FUNCIONALIDADE CATEGORIAS
SELECT 
    'FUNCIONALIDADE CATEGORIAS' as tipo,
    sf.id,
    sf.name,
    sf.description,
    sf.category_id,
    sf.url,
    sf.is_active
FROM system_features sf
WHERE sf.name LIKE '%categor%'
ORDER BY sf.name;

-- 5. VERIFICAR PERMISSÕES ESPECÍFICAS PARA CATEGORIAS
SELECT 
    'PERMISSÕES CATEGORIAS' as tipo,
    sf.name as funcionalidade,
    p.action,
    p.description,
    COUNT(rp.id) as atribuicoes
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
LEFT JOIN role_permissions rp ON p.id = rp.permission_id
WHERE sf.name LIKE '%categor%'
GROUP BY sf.name, p.action, p.description
ORDER BY sf.name, p.action;

-- 6. VERIFICAR SE USUÁRIO ADMIN TEM PERMISSÃO PARA CATEGORIAS
SELECT 
    'PERMISSÃO ADMIN CATEGORIAS' as tipo,
    u.username,
    ur.name as role_name,
    sf.name as funcionalidade,
    p.action,
    CASE WHEN rp.id IS NOT NULL THEN 'TEM PERMISSÃO' ELSE 'SEM PERMISSÃO' END as status
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
AND sf.name LIKE '%categor%'
ORDER BY sf.name, p.action;

-- 7. VERIFICAR TODAS AS FUNCIONALIDADES E PERMISSÕES DO ADMIN
SELECT 
    'TODAS AS PERMISSÕES DO ADMIN' as tipo,
    sf.name as funcionalidade,
    p.action,
    COUNT(*) as total
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
GROUP BY sf.name, p.action
ORDER BY sf.name, p.action;

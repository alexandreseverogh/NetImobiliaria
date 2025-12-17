-- ========================================
-- CORRIGIR RBAC USANDO ESTRUTURA EXISTENTE
-- ========================================
-- 
-- Este script usa a estrutura existente:
-- - user_roles (equivale a roles)
-- - user_role_assignments (relacionamento usuário ↔ role)
-- - permissions (permissões existentes)
-- - role_permissions (relacionamento role ↔ permissão)

-- 1. VERIFICAR ESTRUTURA EXISTENTE
SELECT 
    'ESTRUTURA EXISTENTE' as tipo,
    'user_roles' as tabela,
    COUNT(*) as registros
FROM user_roles
UNION ALL
SELECT 
    'ESTRUTURA EXISTENTE' as tipo,
    'user_role_assignments' as tabela,
    COUNT(*) as registros
FROM user_role_assignments
UNION ALL
SELECT 
    'ESTRUTURA EXISTENTE' as tipo,
    'permissions' as tabela,
    COUNT(*) as registros
FROM permissions
UNION ALL
SELECT 
    'ESTRUTURA EXISTENTE' as tipo,
    'role_permissions' as tabela,
    COUNT(*) as registros
FROM role_permissions;

-- 2. VER ROLES EXISTENTES
SELECT 
    'ROLES EXISTENTES' as tipo,
    ur.id,
    ur.name as role_name,
    ur.description,
    ur.level,
    ur.is_active,
    ur.two_fa_required
FROM user_roles ur
ORDER BY ur.level DESC;

-- 3. VER USUÁRIOS E SEUS ROLES
SELECT 
    'USUÁRIOS E ROLES' as tipo,
    u.id,
    u.username,
    u.email,
    ur.name as role_name,
    ur.level,
    ura.assigned_at
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
ORDER BY u.username, ur.level DESC;

-- 4. VER PERMISSÕES EXISTENTES
SELECT 
    'PERMISSÕES EXISTENTES' as tipo,
    sf.name as funcionalidade,
    sc.name as categoria,
    p.action,
    p.description
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
ORDER BY sc.name, sf.name, p.action;

-- 5. VER PERMISSÕES POR ROLE
SELECT 
    'PERMISSÕES POR ROLE' as tipo,
    ur.name as role_name,
    ur.level,
    sf.name as funcionalidade,
    sc.name as categoria,
    p.action
FROM user_roles ur
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
ORDER BY ur.level DESC, sc.name, sf.name, p.action;

-- 6. VER FUNCIONALIDADES SEM PERMISSÕES
SELECT 
    'FUNCIONALIDADES SEM PERMISSÕES' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sc.name as categoria
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
WHERE NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.feature_id = sf.id
)
ORDER BY sc.name, sf.name;

-- 7. VER FUNCIONALIDADES SEM CATEGORIA
SELECT 
    'FUNCIONALIDADES SEM CATEGORIA' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sf.description
FROM system_features sf
WHERE sf.category_id IS NULL
ORDER BY sf.name;

-- 8. RESUMO PARA IMPLEMENTAÇÃO
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Roles existentes: ' || (SELECT COUNT(*) FROM user_roles) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Usuários com roles: ' || (SELECT COUNT(*) FROM user_role_assignments) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Permissões existentes: ' || (SELECT COUNT(*) FROM permissions) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Atribuições de permissões: ' || (SELECT COUNT(*) FROM role_permissions) as info
UNION ALL
SELECT 
    'RESUMO PARA IMPLEMENTAÇÃO' as tipo,
    'Funcionalidades sem permissões: ' || (SELECT COUNT(*) FROM system_features WHERE NOT EXISTS (SELECT 1 FROM permissions p WHERE p.feature_id = system_features.id)) as info;

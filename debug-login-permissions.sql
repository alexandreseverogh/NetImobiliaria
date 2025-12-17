-- ============================================
-- DEBUG LOGIN PERMISSIONS - ADMIN
-- ============================================

-- 1. Verificar dados do admin
SELECT 
    u.id, u.username, u.email, u.ativo,
    ur.name as role_name, ur.is_active as role_active
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin';

-- 2. Verificar se admin tem perfil ativo
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM users u
            JOIN user_role_assignments ura ON u.id = ura.user_id
            JOIN user_roles ur ON ura.role_id = ur.id
            WHERE u.username = 'admin' 
              AND ur.is_active = true
        ) THEN '✅ Admin TEM perfil ativo'
        ELSE '❌ Admin NÃO TEM perfil ativo'
    END as status_perfil;

-- 3. Verificar permissões específicas para usuários (como no login)
SELECT 
    sf.category as resource,
    p.action,
    CASE 
        WHEN p.action = 'create' OR p.action = 'update' THEN 'WRITE'
        WHEN p.action = 'delete' THEN 'DELETE'
        WHEN p.action = 'read' OR p.action = 'list' THEN 'READ'
        WHEN p.action = 'admin' THEN 'ADMIN'
        ELSE p.action
    END as permission_level
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
  AND u.ativo = true
  AND ura.role_id IN (SELECT id FROM user_roles WHERE is_active = true)
  AND sf.is_active = true
  AND sf.category = 'usuarios'
ORDER BY p.action;

-- 4. Verificar se tem permissão WRITE para usuários
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM users u
            JOIN user_role_assignments ura ON u.id = ura.user_id
            JOIN role_permissions rp ON ura.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            JOIN system_features sf ON p.feature_id = sf.id
            WHERE u.username = 'admin'
              AND u.ativo = true
              AND ura.role_id IN (SELECT id FROM user_roles WHERE is_active = true)
              AND sf.is_active = true
              AND sf.category = 'usuarios'
              AND (p.action = 'create' OR p.action = 'update')
        ) THEN '✅ Admin TEM permissão WRITE para usuários'
        ELSE '❌ Admin NÃO TEM permissão WRITE para usuários'
    END as status_write_permission;

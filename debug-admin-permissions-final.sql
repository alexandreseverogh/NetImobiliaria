-- ============================================
-- DEBUG FINAL - PERMISSÕES DO ADMIN PARA USUÁRIOS
-- ============================================

-- 1. Verificar permissões específicas do admin para usuários
SELECT 
    sf.category,
    p.action,
    p.description,
    rp.granted_at
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
  AND sf.category = 'usuarios'
ORDER BY p.action;

-- 2. Verificar se tem permissão UPDATE especificamente
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
              AND sf.category = 'usuarios'
              AND p.action = 'update'
        ) THEN '✅ Admin TEM permissão UPDATE para usuários'
        ELSE '❌ Admin NÃO TEM permissão UPDATE para usuários'
    END as status_permissao_update;

-- 3. Verificar se tem permissão CREATE especificamente
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
              AND sf.category = 'usuarios'
              AND p.action = 'create'
        ) THEN '✅ Admin TEM permissão CREATE para usuários'
        ELSE '❌ Admin NÃO TEM permissão CREATE para usuários'
    END as status_permissao_create;

-- 4. Verificar se tem permissão DELETE especificamente
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
              AND sf.category = 'usuarios'
              AND p.action = 'delete'
        ) THEN '✅ Admin TEM permissão DELETE para usuários'
        ELSE '❌ Admin NÃO TEM permissão DELETE para usuários'
    END as status_permissao_delete;

-- 5. Verificar se tem permissão READ especificamente
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
              AND sf.category = 'usuarios'
              AND p.action = 'read'
        ) THEN '✅ Admin TEM permissão READ para usuários'
        ELSE '❌ Admin NÃO TEM permissão READ para usuários'
    END as status_permissao_read;



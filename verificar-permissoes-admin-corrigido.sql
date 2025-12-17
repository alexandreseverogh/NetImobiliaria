-- ============================================
-- VERIFICAR PERMISSÕES DO ADMIN PARA EDIÇÃO (CORRIGIDO)
-- ============================================

-- 1. Buscar usuário admin e seu perfil
SELECT 
    u.id, 
    u.username, 
    u.email, 
    u.nome,
    ur.name as role_name, 
    ur.description as role_description
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin';

-- 2. Buscar permissões do admin para usuários
SELECT 
    sf.category,
    p.action,
    p.description,
    rp.granted_at,
    rp.granted_by
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
  AND sf.category = 'usuarios'
ORDER BY p.action;

-- 3. Verificar se tem permissão de escrita (update/create)
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
              AND (p.action = 'update' OR p.action = 'create')
        ) THEN '✅ Admin TEM permissão de escrita para usuários'
        ELSE '❌ Admin NÃO TEM permissão de escrita para usuários'
    END as status_permissao_escrita;

-- 4. Verificar especificamente permissão de UPDATE
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

-- 5. Verificar especificamente permissão de CREATE
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

-- 6. Resumo de todas as permissões do admin
SELECT 
    sf.category,
    COUNT(*) as total_permissions
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
GROUP BY sf.category
ORDER BY sf.category;

-- ============================================
-- VERIFICAR PERMISSÕES DO ADMIN PARA EDIÇÃO
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
    rp.granted,
    rp.granted_at
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
              AND rp.granted = true
        ) THEN '✅ Admin TEM permissão de escrita para usuários'
        ELSE '❌ Admin NÃO TEM permissão de escrita para usuários'
    END as status_permissao_escrita;

-- 4. Resumo de todas as permissões do admin
SELECT 
    sf.category,
    COUNT(*) as total_permissions,
    SUM(CASE WHEN rp.granted THEN 1 ELSE 0 END) as granted_permissions
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
GROUP BY sf.category
ORDER BY sf.category;

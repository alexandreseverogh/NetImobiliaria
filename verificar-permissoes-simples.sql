-- ============================================
-- VERIFICAÇÃO SIMPLES DAS PERMISSÕES DO ADMIN
-- ============================================

-- 1. Verificar permissões atuais do admin para usuários
SELECT 
    sf.category,
    p.action,
    p.description
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
  AND sf.category = 'usuarios'
ORDER BY p.action;

-- 2. Verificar se tem permissão WRITE
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
              AND (p.action = 'create' OR p.action = 'update')
        ) THEN '✅ Admin TEM permissão WRITE'
        ELSE '❌ Admin NÃO TEM permissão WRITE'
    END as status;

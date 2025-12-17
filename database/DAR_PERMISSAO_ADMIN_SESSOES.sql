-- ============================================================
-- DAR PERMISSÃO AO ADMIN PARA ACESSAR SESSÕES
-- ============================================================
-- Objetivo: Dar permissão EXECUTE para Sessões ao usuário admin
-- ============================================================

-- 1. Verificar qual role o usuário admin tem
SELECT 
    u.username,
    ur.id as role_id,
    ur.name as role_name
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin';

-- 2. Dar permissão EXECUTE para Sessões ao role Super Admin
INSERT INTO role_permissions (role_id, permission_id, created_at, updated_at)
SELECT 
    ur.id as role_id,
    p.id as permission_id,
    NOW() as created_at,
    NOW() as updated_at
FROM user_roles ur
CROSS JOIN permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Super Admin'
  AND sf.name = 'Sessões'
  AND p.action = 'EXECUTE'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp2 
    WHERE rp2.role_id = ur.id 
      AND rp2.permission_id = p.id
  );

-- 3. Verificar se a permissão foi criada
SELECT 
    u.username,
    ur.name as role_name,
    sf.name as feature_name,
    p.action,
    p.description
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin' 
  AND sf.name = 'Sessões';

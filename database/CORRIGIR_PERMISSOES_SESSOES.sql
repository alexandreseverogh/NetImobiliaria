-- ============================================================
-- CORREÇÃO DE PERMISSÕES PARA SESSÕES
-- ============================================================
-- Objetivo: Dar permissão ao usuário admin para acessar Sessões
-- ============================================================

-- 1. Verificar qual role o usuário admin tem
SELECT 
    u.username,
    ur.id as role_id,
    ur.name as role_name,
    ur.level as role_level
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin';

-- 2. Verificar se o role do admin já tem permissão para Sessões
SELECT 
    ur.name as role_name,
    sf.name as feature_name,
    p.action,
    p.description
FROM user_roles ur
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Super Admin' 
  AND sf.name = 'Sessões';

-- 3. Dar permissão EXECUTE para Sessões ao role Super Admin
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

-- 4. Verificar se a permissão foi criada
SELECT 
    ur.name as role_name,
    sf.name as feature_name,
    p.action,
    p.description
FROM user_roles ur
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Super Admin' 
  AND sf.name = 'Sessões';

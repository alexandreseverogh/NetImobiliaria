-- ============================================
-- ADICIONAR PERMISSÕES DO ADMIN DIRETAMENTE
-- ============================================

-- 1. Buscar ID do perfil do admin
SELECT 
    ur.id as role_id,
    ur.name as role_name
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin';

-- 2. Buscar IDs das permissões para usuários
SELECT 
    p.id as permission_id,
    p.action,
    p.description
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.category = 'usuarios'
ORDER BY p.action;

-- 3. Adicionar permissões diretamente (substitua os IDs pelos valores encontrados acima)
-- EXEMPLO - ADAPTE OS IDs CONFORME OS RESULTADOS DAS QUERIES ACIMA:

-- Para CREATE:
INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
SELECT 
    ura.role_id,
    p.id,
    u.id,
    NOW()
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN permissions p ON p.feature_id = (SELECT id FROM system_features WHERE category = 'usuarios')
WHERE u.username = 'admin'
  AND p.action = 'create'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = ura.role_id 
      AND rp.permission_id = p.id
  );

-- Para UPDATE:
INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
SELECT 
    ura.role_id,
    p.id,
    u.id,
    NOW()
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN permissions p ON p.feature_id = (SELECT id FROM system_features WHERE category = 'usuarios')
WHERE u.username = 'admin'
  AND p.action = 'update'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = ura.role_id 
      AND rp.permission_id = p.id
  );

-- 4. Verificar se foi adicionado
SELECT 
    'VERIFICAÇÃO FINAL' as status;

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

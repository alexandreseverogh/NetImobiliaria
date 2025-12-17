-- ============================================
-- ADICIONAR PERMISSÕES FINAL - COM IDs ESPECÍFICOS
-- ============================================

-- 1. Adicionar permissão CREATE para o admin
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

-- 2. Adicionar permissão UPDATE para o admin
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

-- 3. Verificar se foi adicionado
SELECT 
    'VERIFICAÇÃO FINAL - PERMISSÕES ADICIONADAS' as status;

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

-- 4. Verificar se agora tem permissão WRITE
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
        ) THEN '✅ Admin AGORA TEM permissão WRITE para usuários'
        ELSE '❌ Admin AINDA NÃO TEM permissão WRITE para usuários'
    END as status_final;



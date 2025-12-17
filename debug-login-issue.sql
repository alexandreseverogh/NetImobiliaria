-- ========================================
-- DEBUG DO PROBLEMA DE LOGIN
-- ========================================

-- 1. VERIFICAR SE USUÁRIO ADMIN EXISTE
SELECT 'USUÁRIO ADMIN:' as info;
SELECT id, username, email, ativo, password IS NOT NULL as has_password 
FROM users 
WHERE username = 'admin' OR email = 'admin@netimobiliaria.com';

-- 2. VERIFICAR ROLES DO ADMIN
SELECT 'ROLES DO ADMIN:' as info;
SELECT 
    u.username,
    ur.name as role_name,
    ur.is_active as role_active,
    ura.expires_at
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin';

-- 3. VERIFICAR SE EXISTEM PERMISSÕES
SELECT 'PERMISSÕES DISPONÍVEIS:' as info;
SELECT COUNT(*) as total_permissions FROM permissions;

-- 4. VERIFICAR SE EXISTEM FEATURES
SELECT 'FEATURES DISPONÍVEIS:' as info;
SELECT COUNT(*) as total_features FROM system_features;

-- 5. VERIFICAR SE EXISTEM CATEGORIAS
SELECT 'CATEGORIAS DISPONÍVEIS:' as info;
SELECT COUNT(*) as total_categories FROM system_categorias;

-- 6. VERIFICAR PERMISSÕES DO ADMIN
SELECT 'PERMISSÕES DO ADMIN:' as info;
SELECT 
    u.username,
    sf.name as feature_name,
    p.action,
    p.description
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
ORDER BY sf.name, p.action;

-- 7. SE NÃO HOUVER PERMISSÕES, CRIAR PERMISSÕES BÁSICAS
SELECT 'CRIANDO PERMISSÕES BÁSICAS...' as info;

-- Criar permissões para todas as features existentes
INSERT INTO permissions (feature_id, action, description)
SELECT sf.id, 'READ', 'Visualizar ' || sf.name
FROM system_features sf
WHERE NOT EXISTS (
    SELECT 1 FROM permissions p WHERE p.feature_id = sf.id AND p.action = 'READ'
);

INSERT INTO permissions (feature_id, action, description)
SELECT sf.id, 'WRITE', 'Criar e editar ' || sf.name
FROM system_features sf
WHERE NOT EXISTS (
    SELECT 1 FROM permissions p WHERE p.feature_id = sf.id AND p.action = 'WRITE'
);

INSERT INTO permissions (feature_id, action, description)
SELECT sf.id, 'DELETE', 'Excluir ' || sf.name
FROM system_features sf
WHERE NOT EXISTS (
    SELECT 1 FROM permissions p WHERE p.feature_id = sf.id AND p.action = 'DELETE'
);

INSERT INTO permissions (feature_id, action, description)
SELECT sf.id, 'ADMIN', 'Administrar ' || sf.name
FROM system_features sf
WHERE NOT EXISTS (
    SELECT 1 FROM permissions p WHERE p.feature_id = sf.id AND p.action = 'ADMIN'
);

-- 8. ASSOCIAR PERMISSÕES AO ROLE ADMINISTRADOR
INSERT INTO role_permissions (role_id, permission_id)
SELECT ur.id, p.id
FROM user_roles ur, permissions p
WHERE ur.name = 'Administrador'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = ur.id AND rp.permission_id = p.id
);

-- 9. ASSOCIAR PERMISSÕES AO ROLE SUPER ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT ur.id, p.id
FROM user_roles ur, permissions p
WHERE ur.name = 'Super Admin'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = ur.id AND rp.permission_id = p.id
);

-- 10. VERIFICAR RESULTADO FINAL
SELECT 'VERIFICAÇÃO FINAL - PERMISSÕES DO ADMIN:' as info;
SELECT 
    u.username,
    COUNT(p.id) as total_permissions,
    COUNT(DISTINCT sf.name) as total_features
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
GROUP BY u.username;

-- ========================================
-- CORRIGIR LOGIN - VERSÃO SIMPLIFICADA
-- ========================================

-- 1. VERIFICAR SE USUÁRIO ADMIN EXISTE
SELECT id, username, email, ativo FROM users WHERE username = 'admin' OR email = 'admin@netimobiliaria.com';

-- 2. VERIFICAR ROLES DO ADMIN
SELECT 
    u.username,
    ur.name as role_name,
    ur.is_active as role_active
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin';

-- 3. VERIFICAR PERMISSÕES DO ADMIN
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

-- 4. SE NÃO HOUVER PERMISSÕES, CRIAR PERMISSÕES BÁSICAS
-- (Execute apenas se necessário)

-- Criar permissões básicas para System Features
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

-- Associar permissões ao role Administrador
INSERT INTO role_permissions (role_id, permission_id)
SELECT ur.id, p.id
FROM user_roles ur, permissions p
WHERE ur.name = 'Administrador'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = ur.id AND rp.permission_id = p.id
);

-- Associar permissões ao role Super Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT ur.id, p.id
FROM user_roles ur, permissions p
WHERE ur.name = 'Super Admin'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = ur.id AND rp.permission_id = p.id
);

-- ============================================================
-- VERIFICAR POSSÍVEIS PROBLEMAS QUE CAUSAM LOOP DE LOGIN
-- ============================================================

-- 1. VERIFICAR USUÁRIO ADMIN
SELECT 
    id,
    username,
    email,
    is_active,
    role_id,
    created_at
FROM users 
WHERE username = 'admin' 
   OR email = 'admin@123'
   OR id = '9bd5d2c8-5f3e-4b8a-9c3e-4f6a7b8c9d0e';

-- 2. VERIFICAR ROLE DO ADMIN
SELECT 
    ur.id,
    ur.name,
    ur.level,
    ur.is_active,
    ur.requires_2fa,
    ur.is_system_role
FROM users u
JOIN user_roles ur ON u.role_id = ur.id
WHERE u.username = 'admin' OR u.email = 'admin@123';

-- 3. VERIFICAR SE USUÁRIO TEM ROLE ATRIBUIDO
SELECT 
    u.id,
    u.username,
    u.email,
    u.role_id,
    ur.name as role_name,
    ur.is_active as role_is_active
FROM users u
LEFT JOIN user_roles ur ON u.role_id = ur.id
WHERE u.username = 'admin' OR u.email = 'admin@123';

-- 4. VERIFICAR SESSÕES ATIVAS DO ADMIN
SELECT 
    id,
    user_id,
    ip_address,
    user_agent,
    created_at,
    expires_at,
    is_active
FROM user_sessions 
WHERE user_id IN (SELECT id FROM users WHERE username = 'admin' OR email = 'admin@123')
ORDER BY created_at DESC
LIMIT 5;

-- 5. VERIFICAR PERMISSÕES DO ROLE DO ADMIN
SELECT 
    ur.name as role_name,
    sf.name as feature_name,
    p.action,
    p.description
FROM users u
JOIN user_roles ur ON u.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin' OR u.email = 'admin@123'
ORDER BY sf.name, p.action;

-- 6. VERIFICAR SE HÁ PROBLEMAS NA TABELA USER_ROLES (NULL, valores inválidos)
SELECT 
    id,
    name,
    level,
    is_active,
    requires_2fa,
    is_system_role,
    CASE 
        WHEN level IS NULL THEN 'ERRO: level é NULL'
        WHEN level < 1 OR level > 10 THEN 'ERRO: level fora do range (1-10)'
        WHEN name IS NULL OR name = '' THEN 'ERRO: name é NULL ou vazio'
        ELSE 'OK'
    END as status
FROM user_roles
WHERE level IS NULL 
   OR level < 1 
   OR level > 10
   OR name IS NULL 
   OR name = '';

-- 7. VERIFICAR SE ADMIN TEM ROLE_ID VÁLIDO
SELECT 
    u.id,
    u.username,
    u.email,
    u.role_id,
    ur.name as role_name,
    CASE 
        WHEN u.role_id IS NULL THEN 'ERRO: role_id é NULL'
        WHEN ur.id IS NULL THEN 'ERRO: role não encontrado'
        WHEN ur.is_active = false THEN 'AVISO: role está inativo'
        ELSE 'OK'
    END as status
FROM users u
LEFT JOIN user_roles ur ON u.role_id = ur.id
WHERE u.username = 'admin' OR u.email = 'admin@123';

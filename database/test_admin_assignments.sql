-- ============================================================
-- TESTE: VERIFICAR ASSIGNMENTS DO ADMIN
-- Execute e envie os resultados
-- ============================================================

-- 1. VERIFICAR USER ADMIN
SELECT 
    id,
    username,
    email,
    pg_typeof(id) as id_type,
    ativo,
    created_at
FROM users
WHERE username = 'admin' OR email = 'admin@123';

-- 2. VERIFICAR USER_ROLE_ASSIGNMENTS DO ADMIN
SELECT 
    ura.id,
    ura.user_id,
    ura.role_id,
    ura.assigned_at,
    ura.expires_at,
    u.username,
    u.email,
    ur.name as role_name,
    ur.level as role_level,
    ur.is_active as role_is_active
FROM user_role_assignments ura
LEFT JOIN users u ON ura.user_id = u.id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin' OR u.email = 'admin@123';

-- 3. VERIFICAR TODOS OS ROLES DISPONÍVEIS
SELECT 
    id,
    name,
    level,
    is_active,
    requires_2fa,
    is_system_role
FROM user_roles
ORDER BY id;

-- 4. CONTAR TOTAL DE ASSIGNMENTS NO SISTEMA
SELECT 
    COUNT(*) as total_assignments,
    COUNT(DISTINCT user_id) as usuarios_com_role,
    COUNT(DISTINCT role_id) as roles_em_uso
FROM user_role_assignments;

-- 5. VERIFICAR SE EXISTE ROLE "Super Admin"
SELECT 
    id,
    name,
    level,
    is_active
FROM user_roles
WHERE name LIKE '%Admin%'
ORDER BY level DESC;

-- 6. RESUMO COMPLETO DO ADMIN
SELECT 
    u.id as user_id,
    u.username,
    u.email,
    u.ativo as user_ativo,
    CASE 
        WHEN ura.id IS NULL THEN 'SEM ASSIGNMENT'
        WHEN ur.id IS NULL THEN 'ASSIGNMENT SEM ROLE'
        WHEN ur.is_active = false THEN 'ROLE INATIVO'
        ELSE 'OK'
    END as status,
    ura.id as assignment_id,
    ur.id as role_id,
    ur.name as role_name,
    ur.level as role_level
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin' OR u.email = 'admin@123';


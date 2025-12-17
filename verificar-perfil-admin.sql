-- ============================================
-- VERIFICAR PERFIL REAL DO USUÁRIO ADMIN
-- ============================================

-- 1. Verificar qual perfil o usuário admin tem
SELECT 
    'PERFIL ATUAL DO USUÁRIO ADMIN' as verificacao;

SELECT 
    u.id as user_id,
    u.username,
    u.email,
    ur.id as role_id,
    ur.name as role_name,
    ur.description as role_description,
    ur.is_active as role_active
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin';

-- 2. Verificar se existe perfil "Administrador"
SELECT 
    'PERFIL ADMINISTRADOR NO SISTEMA' as verificacao;

SELECT 
    id,
    name,
    description,
    is_active
FROM user_roles 
WHERE name ILIKE '%admin%' OR name ILIKE '%administrador%'
ORDER BY name;

-- 3. Verificar todos os perfis disponíveis
SELECT 
    'TODOS OS PERFIS DISPONÍVEIS' as verificacao;

SELECT 
    id,
    name,
    description,
    is_active
FROM user_roles 
ORDER BY name;

-- 4. Verificar se admin tem perfil atribuído
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM users u
            JOIN user_role_assignments ura ON u.id = ura.user_id
            JOIN user_roles ur ON ura.role_id = ur.id
            WHERE u.username = 'admin'
        ) THEN '✅ Admin TEM perfil atribuído'
        ELSE '❌ Admin NÃO TEM perfil atribuído'
    END as status_perfil_atribuido;



-- Verificação simples das permissões do admin
-- 1. Funcionalidades do sistema
SELECT 'FUNCIONALIDADES' as tipo, COUNT(*) as total FROM system_features WHERE is_active = true;

-- 2. Permissões por ação
SELECT 'PERMISSÕES POR AÇÃO' as tipo, action, COUNT(*) as total 
FROM permissions 
GROUP BY action 
ORDER BY action;

-- 3. Roles e suas permissões
SELECT 'ROLES E PERMISSÕES' as tipo, ur.name as role_name, COUNT(rp.permission_id) as total_permissions
FROM user_roles ur
LEFT JOIN role_permissions rp ON ur.id = rp.role_id
GROUP BY ur.id, ur.name, ur.level
ORDER BY ur.level DESC;

-- 4. Permissões do admin
SELECT 'PERMISSÕES DO ADMIN' as tipo, sf.name as feature_name, p.action
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin' AND sf.is_active = true
ORDER BY sf.name, p.action;

-- 5. Funcionalidades SEM permissões para admin
SELECT 'SEM PERMISSÕES' as tipo, sf.name, sf.url
FROM system_features sf
WHERE sf.is_active = true
  AND sf.id NOT IN (
    SELECT DISTINCT p.feature_id
    FROM users u
    JOIN user_role_assignments ura ON u.id = ura.user_id
    JOIN user_roles ur ON ura.role_id = ur.id
    JOIN role_permissions rp ON ur.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.username = 'admin'
  )
ORDER BY sf.name;

-- Verificar se a funcionalidade "roles" existe e se o admin tem permissão
SELECT sf.name, sf.category, p.action, p.id as permission_id
FROM system_features sf 
JOIN permissions p ON sf.id = p.feature_id 
WHERE sf.category = 'roles' OR sf.name ILIKE '%perfil%';

-- Verificar se o admin tem permissão para roles
SELECT ur.name as role_name, p.action, sf.name as feature_name
FROM user_roles ur
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Super Admin' AND sf.category = 'roles';



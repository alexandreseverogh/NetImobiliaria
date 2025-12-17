-- Debug das permissões usando SQL direto
-- 1. Verificar usuário admin
SELECT 'USUÁRIO ADMIN' as info, u.id, u.username, u.email, ur.name as role_name, ur.level as role_level
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin';

-- 2. Verificar permissões do admin (query real)
SELECT 'PERMISSÕES DO ADMIN' as info,
       sf.name as resource,
       p.action,
       CASE 
         WHEN p.action = 'create' OR p.action = 'update' THEN 'WRITE'
         WHEN p.action = 'delete' THEN 'DELETE'
         WHEN p.action = 'read' OR p.action = 'list' THEN 'READ'
         WHEN p.action = 'admin' THEN 'ADMIN'
         ELSE p.action
       END as permission_level
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
  AND u.ativo = true
  AND sf.is_active = true
ORDER BY sf.name, p.action;

-- 3. Verificar funcionalidades específicas do sidebar
SELECT 'FUNCIONALIDADES SIDEBAR' as info,
       sf.name,
       COUNT(p.id) as total_permissions,
       STRING_AGG(p.action, ', ') as actions
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf.name IN (
  'Funcinalidades do Sistema',
  'Categorias de Funcionalidades', 
  'Hierarquia de Perfis',
  'Gestão de Perfis',
  'Gestão de permissões',
  'Usuários',
  'Tipos de Documentos'
)
GROUP BY sf.id, sf.name
ORDER BY sf.name;


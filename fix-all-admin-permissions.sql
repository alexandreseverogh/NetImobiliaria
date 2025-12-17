-- Script para corrigir todas as permissões do admin e super admin
-- 1. Primeiro, vamos ver quantas funcionalidades existem
SELECT 'VERIFICAÇÃO INICIAL' as status, COUNT(*) as total_funcionalidades 
FROM system_features WHERE is_active = true;

-- 2. Criar permissões para TODAS as funcionalidades ativas
INSERT INTO permissions (action, feature_id)
SELECT 
  'read' as action,
  sf.id as feature_id
FROM system_features sf
WHERE sf.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM permissions p WHERE p.feature_id = sf.id AND p.action = 'read'
  );

INSERT INTO permissions (action, feature_id)
SELECT 
  'create' as action,
  sf.id as feature_id
FROM system_features sf
WHERE sf.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM permissions p WHERE p.feature_id = sf.id AND p.action = 'create'
  );

INSERT INTO permissions (action, feature_id)
SELECT 
  'update' as action,
  sf.id as feature_id
FROM system_features sf
WHERE sf.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM permissions p WHERE p.feature_id = sf.id AND p.action = 'update'
  );

INSERT INTO permissions (action, feature_id)
SELECT 
  'delete' as action,
  sf.id as feature_id
FROM system_features sf
WHERE sf.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM permissions p WHERE p.feature_id = sf.id AND p.action = 'delete'
  );

INSERT INTO permissions (action, feature_id)
SELECT 
  'admin' as action,
  sf.id as feature_id
FROM system_features sf
WHERE sf.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM permissions p WHERE p.feature_id = sf.id AND p.action = 'admin'
  );

-- 3. Atribuir TODAS as permissões ao role Super Admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  ur.id as role_id,
  p.id as permission_id
FROM user_roles ur
CROSS JOIN permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Super Admin'
  AND sf.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = ur.id AND rp.permission_id = p.id
  );

-- 4. Atribuir TODAS as permissões ao role Administrador
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  ur.id as role_id,
  p.id as permission_id
FROM user_roles ur
CROSS JOIN permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Administrador'
  AND sf.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = ur.id AND rp.permission_id = p.id
  );

-- 5. Verificar resultado final
SELECT 'RESULTADO FINAL' as status, 
       ur.name as role_name, 
       COUNT(rp.permission_id) as total_permissions
FROM user_roles ur
LEFT JOIN role_permissions rp ON ur.id = rp.role_id
WHERE ur.name IN ('Super Admin', 'Administrador')
GROUP BY ur.id, ur.name
ORDER BY ur.level DESC;

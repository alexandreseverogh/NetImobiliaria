-- 1. Inserir funcionalidade system-features
INSERT INTO system_features (name, description, category, url, is_active, created_at, updated_at)
VALUES ('Funcionalidades do Sistema', 'Gerenciar funcionalidades e permissões do sistema', 'system-features', '/admin/system-features', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- 2. Inserir permissões (create, read, update, delete)
INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
SELECT id, 'create', 'Criar gestão de funcionalidades do sistema', NOW(), NOW()
FROM system_features WHERE name = 'Funcionalidades do Sistema'
ON CONFLICT (feature_id, action) DO NOTHING;

INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
SELECT id, 'read', 'Visualizar gestão de funcionalidades do sistema', NOW(), NOW()
FROM system_features WHERE name = 'Funcionalidades do Sistema'
ON CONFLICT (feature_id, action) DO NOTHING;

INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
SELECT id, 'update', 'Editar gestão de funcionalidades do sistema', NOW(), NOW()
FROM system_features WHERE name = 'Funcionalidades do Sistema'
ON CONFLICT (feature_id, action) DO NOTHING;

INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
SELECT id, 'delete', 'Excluir gestão de funcionalidades do sistema', NOW(), NOW()
FROM system_features WHERE name = 'Funcionalidades do Sistema'
ON CONFLICT (feature_id, action) DO NOTHING;

-- 3. Atribuir ao Super Admin (usando UUID do usuário admin)
INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
SELECT 
  ur.id, 
  p.id, 
  (SELECT id FROM users WHERE username = 'admin' LIMIT 1), 
  NOW()
FROM user_roles ur
CROSS JOIN permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Super Admin' AND sf.name = 'Funcionalidades do Sistema'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. Verificar se foi criado corretamente
SELECT 
  sf.name as funcionalidade,
  p.action as permissao,
  ur.name as perfil,
  COUNT(*) as total
FROM system_features sf
JOIN permissions p ON sf.id = p.feature_id
LEFT JOIN role_permissions rp ON p.id = rp.permission_id
LEFT JOIN user_roles ur ON rp.role_id = ur.id
WHERE sf.name = 'Funcionalidades do Sistema'
GROUP BY sf.name, p.action, ur.name
ORDER BY p.action, ur.name;

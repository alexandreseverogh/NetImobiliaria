-- CORREÇÃO COMPLETA DE PERMISSÕES POR CATEGORIA
-- Baseado na análise de negócio

BEGIN;

-- 1. CORRIGIR "Configuração Sistema" - apenas 'execute'
-- Remover permissões desnecessárias
DELETE FROM role_permissions 
WHERE permission_id IN (
  SELECT p.id 
  FROM permissions p
  JOIN system_features sf ON p.feature_id = sf.id
  WHERE sf.category = 'Configuração Sistema'
  AND p.action IN ('create', 'read', 'update', 'delete')
);

DELETE FROM permissions 
WHERE id IN (
  SELECT p.id 
  FROM permissions p
  JOIN system_features sf ON p.feature_id = sf.id
  WHERE sf.category = 'Configuração Sistema'
  AND p.action IN ('create', 'read', 'update', 'delete')
);

-- Garantir que existe apenas 'execute' para Configuração Sistema
INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
SELECT 
  sf.id,
  'execute',
  'Executar configurações do sistema',
  NOW(),
  NOW()
FROM system_features sf
WHERE sf.category = 'Configuração Sistema'
AND NOT EXISTS (
  SELECT 1 FROM permissions p 
  WHERE p.feature_id = sf.id AND p.action = 'execute'
);

-- 2. CORRIGIR "Dashboards" - apenas 'read'
DELETE FROM role_permissions 
WHERE permission_id IN (
  SELECT p.id 
  FROM permissions p
  JOIN system_features sf ON p.feature_id = sf.id
  WHERE sf.category = 'Dashboards'
  AND p.action IN ('create', 'update', 'delete', 'execute')
);

DELETE FROM permissions 
WHERE id IN (
  SELECT p.id 
  FROM permissions p
  JOIN system_features sf ON p.feature_id = sf.id
  WHERE sf.category = 'Dashboards'
  AND p.action IN ('create', 'update', 'delete', 'execute')
);

-- Garantir que existe apenas 'read' para Dashboards
INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
SELECT 
  sf.id,
  'read',
  'Visualizar dashboards',
  NOW(),
  NOW()
FROM system_features sf
WHERE sf.category = 'Dashboards'
AND NOT EXISTS (
  SELECT 1 FROM permissions p 
  WHERE p.feature_id = sf.id AND p.action = 'read'
);

-- 3. CORRIGIR "Relatorios" - apenas 'read'
DELETE FROM role_permissions 
WHERE permission_id IN (
  SELECT p.id 
  FROM permissions p
  JOIN system_features sf ON p.feature_id = sf.id
  WHERE sf.category = 'Relatorios'
  AND p.action IN ('create', 'update', 'delete', 'execute')
);

DELETE FROM permissions 
WHERE id IN (
  SELECT p.id 
  FROM permissions p
  JOIN system_features sf ON p.feature_id = sf.id
  WHERE sf.category = 'Relatorios'
  AND p.action IN ('create', 'update', 'delete', 'execute')
);

-- Garantir que existe apenas 'read' para Relatorios
INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
SELECT 
  sf.id,
  'read',
  'Visualizar relatórios',
  NOW(),
  NOW()
FROM system_features sf
WHERE sf.category = 'Relatorios'
AND NOT EXISTS (
  SELECT 1 FROM permissions p 
  WHERE p.feature_id = sf.id AND p.action = 'read'
);

-- 4. CORRIGIR "Hierarquia de Perfis" - apenas 'execute'
DELETE FROM role_permissions 
WHERE permission_id IN (
  SELECT p.id 
  FROM permissions p
  JOIN system_features sf ON p.feature_id = sf.id
  WHERE sf.category = 'Hierarquia de Perfis'
  AND p.action IN ('create', 'read', 'update', 'delete')
);

DELETE FROM permissions 
WHERE id IN (
  SELECT p.id 
  FROM permissions p
  JOIN system_features sf ON p.feature_id = sf.id
  WHERE sf.category = 'Hierarquia de Perfis'
  AND p.action IN ('create', 'read', 'update', 'delete')
);

-- Garantir que existe apenas 'execute' para Hierarquia de Perfis
INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
SELECT 
  sf.id,
  'execute',
  'Executar configuração de hierarquia de perfis',
  NOW(),
  NOW()
FROM system_features sf
WHERE sf.category = 'Hierarquia de Perfis'
AND NOT EXISTS (
  SELECT 1 FROM permissions p 
  WHERE p.feature_id = sf.id AND p.action = 'execute'
);

-- 5. ALTERAR categoria "system-features" para "funcionalidades"
UPDATE system_features 
SET category = 'funcionalidades'
WHERE category = 'system-features';

-- 6. REMOVER categoria "Painel Adminisrativo" (é apenas agrupador da sidebar)
-- Primeiro, mover funcionalidades para categorias específicas
UPDATE system_features 
SET category = 'roles'
WHERE category = 'Painel Adminisrativo' 
AND name IN ('Gestão de Perfis', 'Perfis');

UPDATE system_features 
SET category = 'permissions'
WHERE category = 'Painel Adminisrativo' 
AND name IN ('Configurar Permissões', 'Permissões');

UPDATE system_features 
SET category = 'hierarchy'
WHERE category = 'Painel Adminisrativo' 
AND name IN ('Hierarquia de Perfis');

UPDATE system_features 
SET category = 'usuarios'
WHERE category = 'Painel Adminisrativo' 
AND name IN ('Usuários');

-- Depois, remover funcionalidades órfãs da categoria Painel Adminisrativo
DELETE FROM role_permissions 
WHERE permission_id IN (
  SELECT p.id 
  FROM permissions p
  JOIN system_features sf ON p.feature_id = sf.id
  WHERE sf.category = 'Painel Adminisrativo'
);

DELETE FROM permissions 
WHERE feature_id IN (
  SELECT id FROM system_features 
  WHERE category = 'Painel Adminisrativo'
);

DELETE FROM system_features 
WHERE category = 'Painel Adminisrativo';

-- 7. REATRIBUIR PERMISSÕES CORRIGIDAS AO SUPER ADMIN
-- Para cada categoria corrigida, atribuir as novas permissões ao Super Admin
INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
SELECT 
  ur.id,
  p.id,
  (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
  NOW()
FROM user_roles ur
CROSS JOIN permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Super Admin'
AND sf.category IN ('Configuração Sistema', 'Dashboards', 'Relatorios', 'Hierarquia de Perfis', 'roles', 'permissions', 'usuarios', 'hierarchy', 'funcionalidades')
ON CONFLICT (role_id, permission_id) DO NOTHING;

COMMIT;

-- 8. VERIFICAÇÃO FINAL
SELECT 
  'RESULTADO FINAL:' as status,
  sf.category,
  sf.name as feature_name,
  p.action,
  p.description
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf.category IN ('Configuração Sistema', 'Dashboards', 'Relatorios', 'Hierarquia de Perfis', 'roles', 'permissions', 'usuarios', 'hierarchy', 'funcionalidades')
ORDER BY sf.category, sf.name, p.action;

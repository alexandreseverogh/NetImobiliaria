-- =====================================================
-- MIGRAÇÃO: REMOVER CAMPO CARGO E IMPLEMENTAR PERFIS
-- =====================================================

-- 1. Criar perfis baseados nos cargos existentes
INSERT INTO user_roles (name, description, level, is_active) VALUES
('Administrador', 'Acesso total ao sistema com todas as permissões', 100, true),
('Corretor', 'Acesso para gerenciar imóveis, proximidades e amenidades', 50, true),
('Assistente', 'Acesso de leitura para consultas e relatórios', 25, true)
ON CONFLICT (name) DO NOTHING;

-- 2. Criar funcionalidades do sistema
INSERT INTO system_features (name, description, url, category) VALUES
-- Gestão de Imóveis
('Gestão de Imóveis', 'CRUD completo de imóveis', '/admin/imoveis', 'imoveis'),
('Cadastro de Imóveis', 'Criar novos imóveis', '/admin/imoveis/novo', 'imoveis'),
('Edição de Imóveis', 'Editar imóveis existentes', '/admin/imoveis/[id]/edicao', 'imoveis'),
('Visualização de Imóveis', 'Visualizar detalhes dos imóveis', '/admin/imoveis/[id]', 'imoveis'),
('Exclusão de Imóveis', 'Remover imóveis do sistema', '/admin/imoveis/[id]', 'imoveis'),

-- Gestão de Proximidades
('Gestão de Proximidades', 'CRUD de proximidades', '/admin/proximidades', 'proximidades'),
('Cadastro de Proximidades', 'Criar novas proximidades', '/admin/proximidades/novo', 'proximidades'),
('Edição de Proximidades', 'Editar proximidades existentes', '/admin/proximidades/[slug]/editar', 'proximidades'),
('Exclusão de Proximidades', 'Remover proximidades do sistema', '/admin/proximidades/[slug]', 'proximidades'),

-- Gestão de Amenidades
('Gestão de Amenidades', 'CRUD de amenidades', '/admin/amenidades', 'amenidades'),
('Cadastro de Amenidades', 'Criar novas amenidades', '/admin/amenidades/novo', 'amenidades'),
('Edição de Amenidades', 'Editar amenidades existentes', '/admin/amenidades/[slug]/editar', 'amenidades'),
('Exclusão de Amenidades', 'Remover amenidades do sistema', '/admin/amenidades/[slug]', 'amenidades'),

-- Categorias
('Gestão de Categorias-Amenidades', 'CRUD de categorias de amenidades', '/admin/categorias-amenidades', 'categorias-amenidades'),
('Gestão de Categorias-Proximidades', 'CRUD de categorias de proximidades', '/admin/categorias-proximidades', 'categorias-proximidades'),

-- Gestão de Usuários
('Gestão de Usuários', 'CRUD de usuários do sistema', '/admin/usuarios', 'usuarios'),
('Criar Usuários', 'Criar novos usuários', '/admin/usuarios/novo', 'usuarios'),
('Editar Usuários', 'Editar usuários existentes', '/admin/usuarios/[id]/editar', 'usuarios'),
('Excluir Usuários', 'Remover usuários do sistema', '/admin/usuarios/[id]', 'usuarios'),

-- Relatórios
('Relatórios do Sistema', 'Acesso a relatórios e estatísticas', '/admin/relatorios', 'relatorios'),
('Estatísticas de Imóveis', 'Relatórios de imóveis', '/admin/relatorios/imoveis', 'relatorios'),
('Estatísticas de Usuários', 'Relatórios de usuários', '/admin/relatorios/usuarios', 'relatorios')
ON CONFLICT (name) DO NOTHING;

-- 3. Criar permissões base
INSERT INTO permissions (feature_id, action, description) 
SELECT sf.id, 'READ', 'Permissão de leitura para ' || sf.name
FROM system_features sf
ON CONFLICT (feature_id, action) DO NOTHING;

INSERT INTO permissions (feature_id, action, description) 
SELECT sf.id, 'WRITE', 'Permissão de escrita para ' || sf.name
FROM system_features sf
ON CONFLICT (feature_id, action) DO NOTHING;

INSERT INTO permissions (feature_id, action, description) 
SELECT sf.id, 'DELETE', 'Permissão de exclusão para ' || sf.name
FROM system_features sf
ON CONFLICT (feature_id, action) DO NOTHING;

-- 4. Associar permissões aos perfis
-- Administrador: Todas as permissões
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  ur.id as role_id,
  p.id as permission_id
FROM user_roles ur
CROSS JOIN permissions p
WHERE ur.name = 'Administrador'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Corretor: WRITE em imóveis, proximidades, amenidades; READ no resto
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  ur.id as role_id,
  p.id as permission_id
FROM user_roles ur
JOIN permissions p ON p.feature_id IN (
  SELECT id FROM system_features 
  WHERE category IN ('imoveis', 'proximidades', 'amenidades')
)
WHERE ur.name = 'Corretor' AND p.action = 'WRITE'
ON CONFLICT (role_id, permission_id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  ur.id as role_id,
  p.id as permission_id
FROM user_roles ur
JOIN permissions p ON p.feature_id IN (
  SELECT id FROM system_features 
  WHERE category IN ('categorias-amenidades', 'categorias-proximidades', 'usuarios', 'relatorios')
)
WHERE ur.name = 'Corretor' AND p.action = 'READ'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Assistente: Apenas READ em tudo
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  ur.id as role_id,
  p.id as permission_id
FROM user_roles ur
JOIN permissions p ON p.action = 'READ'
WHERE ur.name = 'Assistente'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 5. Associar usuários existentes aos perfis baseados no cargo
INSERT INTO user_role_assignments (user_id, role_id, assigned_by, assigned_at)
SELECT 
  u.id as user_id,
  ur.id as role_id,
  u.id as assigned_by, -- Auto-assignado
  CURRENT_TIMESTAMP as assigned_at
FROM users u
JOIN user_roles ur ON 
  CASE 
    WHEN u.cargo = 'ADMIN' THEN ur.name = 'Administrador'
    WHEN u.cargo = 'CORRETOR' THEN ur.name = 'Corretor'
    WHEN u.cargo = 'ASSISTENTE' THEN ur.name = 'Assistente'
    ELSE ur.name = 'Assistente' -- Default para cargos desconhecidos
  END
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 6. Verificar migração
SELECT 
  'Usuários migrados:' as info,
  COUNT(*) as total_users
FROM user_role_assignments;

SELECT 
  'Perfis criados:' as info,
  COUNT(*) as total_roles
FROM user_roles;

SELECT 
  'Permissões configuradas:' as info,
  COUNT(*) as total_permissions
FROM role_permissions;

-- 7. AGORA PODEMOS REMOVER O CAMPO CARGO (comentar por enquanto)
-- ALTER TABLE users DROP COLUMN IF EXISTS cargo;

-- 8. Mostrar resultado da migração
SELECT 
  u.username,
  u.nome,
  ur.name as perfil_atual,
  ur.description as descricao_perfil,
  ur.level as nivel_acesso
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
ORDER BY ur.level DESC, u.username;











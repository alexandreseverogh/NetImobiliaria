-- =====================================================
-- DADOS INICIAIS DO SISTEMA DE PERMISSÕES (CORRIGIDO)
-- =====================================================

-- Inserir perfis de usuário
INSERT INTO user_roles (name, description, level) VALUES
('Super Admin', 'Acesso total ao sistema, incluindo gestão de outros administradores', 4),
('Administrador', 'Acesso total ao sistema, exceto gestão de super admins', 3),
('Corretor', 'Acesso limitado baseado em permissões específicas', 2),
('Usuário Imobiliária', 'Acesso básico e específico', 1)
ON CONFLICT (name) DO NOTHING;

-- Inserir funcionalidades do sistema
INSERT INTO system_features (name, description, url, category) VALUES
-- Gestão de Imóveis
('Gestão de Imóveis', 'CRUD completo de imóveis', '/admin/imoveis', 'Imóveis'),
('Cadastro de Imóveis', 'Criar novos imóveis', '/admin/imoveis/novo', 'Imóveis'),
('Edição de Imóveis', 'Editar imóveis existentes', '/admin/imoveis/[id]/edicao', 'Imóveis'),
('Visualização de Imóveis', 'Visualizar detalhes dos imóveis', '/admin/imoveis/[id]', 'Imóveis'),
('Exclusão de Imóveis', 'Remover imóveis do sistema', '/admin/imoveis/[id]', 'Imóveis'),

-- Gestão de Amenidades
('Gestão de Amenidades', 'CRUD de amenidades', '/admin/amenidades', 'Amenidades'),
('Cadastro de Amenidades', 'Criar novas amenidades', '/admin/amenidades/novo', 'Amenidades'),
('Edição de Amenidades', 'Editar amenidades existentes', '/admin/amenidades/[slug]/editar', 'Amenidades'),
('Categorias de Amenidades', 'Gestão de categorias', '/admin/categorias-amenidades', 'Amenidades'),

-- Gestão de Proximidades
('Gestão de Proximidades', 'CRUD de proximidades', '/admin/proximidades', 'Proximidades'),
('Cadastro de Proximidades', 'Criar novas proximidades', '/admin/proximidades/novo', 'Proximidades'),
('Edição de Proximidades', 'Editar proximidades existentes', '/admin/proximidades/[slug]/editar', 'Proximidades'),
('Categorias de Proximidades', 'Gestão de categorias', '/admin/categorias-proximidades', 'Proximidades'),

-- Gestão de Usuários
('Gestão de Usuários', 'CRUD de usuários do sistema', '/admin/usuarios', 'Usuários'),
('Cadastro de Usuários', 'Criar novos usuários', '/admin/usuarios/novo', 'Usuários'),
('Edição de Usuários', 'Editar usuários existentes', '/admin/usuarios/[id]/editar', 'Usuários'),
('Gestão de Perfis', 'Configurar perfis e permissões', '/admin/perfis', 'Usuários'),
('Gestão de Permissões', 'Configurar permissões por perfil', '/admin/permissoes', 'Usuários'),

-- Relatórios e Analytics
('Relatórios de Vendas', 'Relatórios de vendas de imóveis', '/admin/relatorios/vendas', 'Relatórios'),
('Relatórios de Visitas', 'Relatórios de visitas aos imóveis', '/admin/relatorios/visitas', 'Relatórios'),
('Dashboard Analytics', 'Dashboard com métricas do sistema', '/admin/dashboard', 'Relatórios'),

-- Configurações do Sistema
('Configurações Gerais', 'Configurações básicas do sistema', '/admin/configuracoes', 'Sistema'),
('Logs de Auditoria', 'Visualizar logs de auditoria', '/admin/logs', 'Sistema'),
('Backup do Sistema', 'Gerenciar backups', '/admin/backup', 'Sistema')
ON CONFLICT (name) DO NOTHING;

-- Inserir permissões para cada funcionalidade
INSERT INTO permissions (feature_id, action, description) 
SELECT 
    sf.id,
    'list',
    'Visualizar lista de ' || LOWER(sf.name)
FROM system_features sf
ON CONFLICT (feature_id, action) DO NOTHING;

INSERT INTO permissions (feature_id, action, description) 
SELECT 
    sf.id,
    'read',
    'Visualizar detalhes de ' || LOWER(sf.name)
FROM system_features sf
ON CONFLICT (feature_id, action) DO NOTHING;

INSERT INTO permissions (feature_id, action, description) 
SELECT 
    sf.id,
    'create',
    'Criar novos registros de ' || LOWER(sf.name)
FROM system_features sf
WHERE sf.name NOT IN ('Dashboard Analytics', 'Logs de Auditoria', 'Backup do Sistema')
ON CONFLICT (feature_id, action) DO NOTHING;

INSERT INTO permissions (feature_id, action, description) 
SELECT 
    sf.id,
    'update',
    'Editar registros de ' || LOWER(sf.name)
FROM system_features sf
WHERE sf.name NOT IN ('Dashboard Analytics', 'Logs de Auditoria', 'Backup do Sistema')
ON CONFLICT (feature_id, action) DO NOTHING;

INSERT INTO permissions (feature_id, action, description) 
SELECT 
    sf.id,
    'delete',
    'Excluir registros de ' || LOWER(sf.name)
FROM system_features sf
WHERE sf.name NOT IN ('Dashboard Analytics', 'Logs de Auditoria', 'Backup do Sistema')
ON CONFLICT (feature_id, action) DO NOTHING;

-- Atribuir permissões ao perfil Super Admin (tudo)
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
    ur.id as role_id,
    p.id as permission_id,
    u.id as granted_by
FROM user_roles ur
CROSS JOIN permissions p
CROSS JOIN users u
WHERE ur.name = 'Super Admin' AND u.username = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Atribuir permissões ao perfil Administrador (tudo exceto gestão de super admins)
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
    ur.id as role_id,
    p.id as permission_id,
    u.id as granted_by
FROM user_roles ur
CROSS JOIN permissions p
JOIN system_features sf ON p.feature_id = sf.id
CROSS JOIN users u
WHERE ur.name = 'Administrador'
  AND sf.name NOT LIKE '%Super Admin%'
  AND u.username = 'admin'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Atribuir permissões ao perfil Corretor (leitura e criação de imóveis)
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
    ur.id as role_id,
    p.id as permission_id,
    u.id as granted_by
FROM user_roles ur
CROSS JOIN permissions p
JOIN system_features sf ON p.feature_id = sf.id
CROSS JOIN users u
WHERE ur.name = 'Corretor'
  AND u.username = 'admin'
  AND (
    (sf.category = 'Imóveis' AND p.action IN ('list', 'read', 'create', 'update'))
    OR (sf.category = 'Amenidades' AND p.action IN ('list', 'read'))
    OR (sf.category = 'Proximidades' AND p.action IN ('list', 'read'))
    OR (sf.category = 'Relatórios' AND p.action IN ('list', 'read'))
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Atribuir permissões ao perfil Usuário Imobiliária (apenas leitura)
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
    ur.id as role_id,
    p.id as permission_id,
    u.id as granted_by
FROM user_roles ur
CROSS JOIN permissions p
JOIN system_features sf ON p.feature_id = sf.id
CROSS JOIN users u
WHERE ur.name = 'Usuário Imobiliária'
  AND u.username = 'admin'
  AND p.action IN ('list', 'read')
  AND sf.category IN ('Imóveis', 'Amenidades', 'Proximidades', 'Relatórios')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Atribuir perfis aos usuários existentes
INSERT INTO user_role_assignments (user_id, role_id, assigned_by)
SELECT 
    u.id as user_id,
    ur.id as role_id,
    admin_user.id as assigned_by
FROM users u
CROSS JOIN user_roles ur
CROSS JOIN users admin_user
WHERE 
    admin_user.username = 'admin'
    AND (
        (u.username = 'admin' AND ur.name = 'Super Admin')
        OR (u.username = 'corretor1' AND ur.name = 'Corretor')
        OR (u.username = 'assistente1' AND ur.name = 'Usuário Imobiliária')
    )
ON CONFLICT (user_id, role_id) DO NOTHING;












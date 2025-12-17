-- ============================================================
-- POPULAR TABELA sidebar_menu_items
-- Baseado na sidebar atual (AdminSidebar.tsx)
-- Data: 26/10/2025
-- ============================================================

-- LIMPAR DADOS EXISTENTES (OPCIONAL - DESCOMENTAR SE NECESSÁRIO)
-- TRUNCATE sidebar_menu_items CASCADE;

-- ============================================================
-- ITENS RAIZ (MENUS PRINCIPAIS)
-- ============================================================

-- 1. PAINEL DO SISTEMA
INSERT INTO sidebar_menu_items (
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required,
    description
) VALUES (
    'Painel do Sistema',
    'wrench',
    NULL,
    'system-panel',
    1,
    true,
    '["Super Admin", "Administrador"]'::jsonb,
    'Configurações e monitoramento do sistema'
);

-- 2. PAINEL ADMINISTRATIVO
INSERT INTO sidebar_menu_items (
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required,
    description
) VALUES (
    'Painel Administrativo',
    'shield',
    NULL,
    'admin-panel',
    2,
    true,
    '["Super Admin", "Administrador"]'::jsonb,
    'Gestão administrativa e de usuários'
);

-- 3. AMENIDADES
INSERT INTO sidebar_menu_items (
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required,
    description
) VALUES (
    'Amenidades',
    'tag',
    NULL,
    'amenidades',
    3,
    true,
    '["Super Admin", "Administrador", "Corretor"]'::jsonb,
    'Gestão de amenidades dos imóveis'
);

-- 4. PROXIMIDADES
INSERT INTO sidebar_menu_items (
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required,
    description
) VALUES (
    'Proximidades',
    'map-pin',
    NULL,
    'proximidades',
    4,
    true,
    '["Super Admin", "Administrador", "Corretor"]'::jsonb,
    'Gestão de proximidades dos imóveis'
);

-- 5. IMÓVEIS
INSERT INTO sidebar_menu_items (
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required,
    description
) VALUES (
    'Imóveis',
    'building',
    NULL,
    'imoveis',
    5,
    true,
    '["Super Admin", "Administrador", "Corretor"]'::jsonb,
    'Gestão de imóveis'
);

-- 6. CLIENTES
INSERT INTO sidebar_menu_items (
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required,
    description
) VALUES (
    'Clientes',
    'users',
    NULL,
    'clientes',
    6,
    true,
    '["Super Admin", "Administrador", "Corretor"]'::jsonb,
    'Gestão de clientes'
);

-- 7. PROPRIETÁRIOS
INSERT INTO sidebar_menu_items (
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required,
    description
) VALUES (
    'Proprietários',
    'user-group',
    NULL,
    'proprietarios',
    7,
    true,
    '["Super Admin", "Administrador", "Corretor"]'::jsonb,
    'Gestão de proprietários'
);

-- 8. DASHBOARDS
INSERT INTO sidebar_menu_items (
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required,
    description
) VALUES (
    'Dashboards',
    'chart',
    '/admin/dashboards',
    'dashboards',
    8,
    true,
    '["Super Admin", "Administrador", "Corretor", "Usuário"]'::jsonb,
    'Dashboards e análises'
);

-- 9. RELATÓRIOS
INSERT INTO sidebar_menu_items (
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required,
    description
) VALUES (
    'Relatórios',
    'document',
    '/admin/relatorios',
    'relatorios',
    9,
    true,
    '["Super Admin", "Administrador", "Corretor", "Usuário"]'::jsonb,
    'Relatórios e exportações'
);

-- ============================================================
-- SUBITENS (FILHOS)
-- ============================================================

-- PAINEL DO SISTEMA - Filhos
INSERT INTO sidebar_menu_items (
    parent_id,
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required
) VALUES 
((SELECT id FROM sidebar_menu_items WHERE name = 'Painel do Sistema'),
    'Categorias', 'squares', '/admin/categorias', 'system-features', 1, true, 
    '["Super Admin", "Administrador"]'::jsonb),
((SELECT id FROM sidebar_menu_items WHERE name = 'Painel do Sistema'),
    'Funcionalidades', 'cog', '/admin/system-features', 'system-features', 2, true, 
    '["Super Admin", "Administrador"]'::jsonb),
((SELECT id FROM sidebar_menu_items WHERE name = 'Painel do Sistema'),
    'Sessões Ativas', 'clock', '/admin/sessions', 'sessions', 3, true, 
    '["Super Admin", "Administrador"]'::jsonb),
((SELECT id FROM sidebar_menu_items WHERE name = 'Painel do Sistema'),
    'Logs do Sistema', 'document', '/admin/login-logs', 'login-logs', 4, true, 
    '["Super Admin", "Administrador"]'::jsonb);

-- PAINEL ADMINISTRATIVO - Filhos
INSERT INTO sidebar_menu_items (
    parent_id,
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required
) VALUES 
((SELECT id FROM sidebar_menu_items WHERE name = 'Painel Administrativo'),
    'Hierarquia de Perfis', 'user-group', '/admin/hierarchy', 'hierarchy', 1, true, 
    '["Super Admin", "Administrador"]'::jsonb),
((SELECT id FROM sidebar_menu_items WHERE name = 'Painel Administrativo'),
    'Gestão de Perfis', 'shield', '/admin/roles', 'roles', 2, true, 
    '["Super Admin", "Administrador"]'::jsonb),
((SELECT id FROM sidebar_menu_items WHERE name = 'Painel Administrativo'),
    'Configurar Permissões', 'cog', '/admin/permissions', 'permissions', 3, true, 
    '["Super Admin", "Administrador"]'::jsonb),
((SELECT id FROM sidebar_menu_items WHERE name = 'Painel Administrativo'),
    'Usuários', 'users', '/admin/usuarios', 'usuarios', 4, true, 
    '["Super Admin", "Administrador"]'::jsonb),
((SELECT id FROM sidebar_menu_items WHERE name = 'Painel Administrativo'),
    'Tipos de Documentos', 'document', '/admin/tipos-documentos', 'tipos-documentos', 5, true, 
    '["Super Admin", "Administrador"]'::jsonb);

-- AMENIDADES - Filhos
INSERT INTO sidebar_menu_items (
    parent_id,
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required
) VALUES 
((SELECT id FROM sidebar_menu_items WHERE name = 'Amenidades'),
    'Categorias', 'squares', '/admin/categorias-amenidades', 'categorias-amenidades', 1, true, 
    '["Super Admin", "Administrador", "Corretor"]'::jsonb),
((SELECT id FROM sidebar_menu_items WHERE name = 'Amenidades'),
    'Amenidades', 'tag', '/admin/amenidades', 'amenidades', 2, true, 
    '["Super Admin", "Administrador", "Corretor"]'::jsonb);

-- PROXIMIDADES - Filhos
INSERT INTO sidebar_menu_items (
    parent_id,
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required
) VALUES 
((SELECT id FROM sidebar_menu_items WHERE name = 'Proximidades'),
    'Categorias', 'squares', '/admin/categorias-proximidades', 'categorias-proximidades', 1, true, 
    '["Super Admin", "Administrador", "Corretor"]'::jsonb),
((SELECT id FROM sidebar_menu_items WHERE name = 'Proximidades'),
    'Proximidades', 'map-pin', '/admin/proximidades', 'proximidades', 2, true, 
    '["Super Admin", "Administrador", "Corretor"]'::jsonb);

-- IMÓVEIS - Filhos
INSERT INTO sidebar_menu_items (
    parent_id,
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required
) VALUES 
((SELECT id FROM sidebar_menu_items WHERE name = 'Imóveis'),
    'Tipos', 'cog', '/admin/tipos-imoveis', 'tipos-imoveis', 1, true, 
    '["Super Admin", "Administrador"]'::jsonb),
((SELECT id FROM sidebar_menu_items WHERE name = 'Imóveis'),
    'Finalidades', 'cog', '/admin/finalidades', 'finalidades', 2, true, 
    '["Super Admin", "Administrador"]'::jsonb),
((SELECT id FROM sidebar_menu_items WHERE name = 'Imóveis'),
    'Status', 'check-circle', '/admin/status-imovel', 'status-imovel', 3, true, 
    '["Super Admin", "Administrador"]'::jsonb),
((SELECT id FROM sidebar_menu_items WHERE name = 'Imóveis'),
    'Mudança de Status', 'clipboard', '/admin/mudancas-status', 'status-imovel', 4, true, 
    '["Super Admin", "Administrador"]'::jsonb),
((SELECT id FROM sidebar_menu_items WHERE name = 'Imóveis'),
    'Cadastro', 'building', '/admin/imoveis', 'imoveis', 5, true, 
    '["Super Admin", "Administrador", "Corretor"]'::jsonb);

-- CLIENTES - Filhos
INSERT INTO sidebar_menu_items (
    parent_id,
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required
) VALUES 
((SELECT id FROM sidebar_menu_items WHERE name = 'Clientes'),
    'Cadastro', 'users', '/admin/clientes', 'clientes', 1, true, 
    '["Super Admin", "Administrador", "Corretor"]'::jsonb);

-- PROPRIETÁRIOS - Filhos
INSERT INTO sidebar_menu_items (
    parent_id,
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required
) VALUES 
((SELECT id FROM sidebar_menu_items WHERE name = 'Proprietários'),
    'Cadastro', 'user-group', '/admin/proprietarios', 'proprietarios', 1, true, 
    '["Super Admin", "Administrador", "Corretor"]'::jsonb);

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================

-- Contar itens criados
SELECT 
    'Total de itens raiz:' as tipo,
    COUNT(*) as quantidade
FROM sidebar_menu_items 
WHERE parent_id IS NULL
UNION ALL
SELECT 
    'Total de subitens:' as tipo,
    COUNT(*) as quantidade
FROM sidebar_menu_items 
WHERE parent_id IS NOT NULL;

-- Mostrar estrutura completa
SELECT 
    id,
    name,
    icon_name,
    url,
    order_index,
    parent_id,
    (SELECT name FROM sidebar_menu_items WHERE id = smi.parent_id) as parent_name
FROM sidebar_menu_items smi
ORDER BY 
    COALESCE(parent_id, id), 
    COALESCE(parent_id, id), 
    order_index;

-- ============================================================
-- FIM DO SCRIPT
-- ============================================================

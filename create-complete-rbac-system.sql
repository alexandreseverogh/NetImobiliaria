-- ========================================
-- CRIAR SISTEMA RBAC COMPLETO
-- ========================================
-- 
-- Este script cria o sistema RBAC completo para implementar:
-- - Gestão de perfis (roles)
-- - Gestão de permissões
-- - Sidebar dinâmica baseada nas permissões do usuário

-- 1. VERIFICAR SE AS TABELAS RBAC EXISTEM
SELECT 
    'VERIFICAÇÃO RBAC' as tipo,
    table_name as tabela,
    CASE WHEN table_name IS NOT NULL THEN 'EXISTE' ELSE 'NÃO EXISTE' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('roles', 'user_role_assignments', 'role_permissions')
ORDER BY table_name;

-- 2. CRIAR TABELA roles (se não existir)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    level INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

-- 3. CRIAR TABELA user_role_assignments (se não existir)
CREATE TABLE IF NOT EXISTS user_role_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    UNIQUE(user_id, role_id)
);

-- 4. CRIAR TABELA role_permissions (se não existir)
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);

-- 5. INSERIR ROLES BÁSICOS (se não existirem)
INSERT INTO roles (name, description, level) VALUES
('Super Admin', 'Acesso total ao sistema', 4),
('Admin', 'Administrador do sistema', 3),
('Gerente', 'Gerente de operações', 2),
('Usuário', 'Usuário padrão', 1)
ON CONFLICT (name) DO NOTHING;

-- 6. VERIFICAR SE EXISTEM PERMISSÕES PARA system_features
SELECT 
    'PERMISSÕES EXISTENTES' as tipo,
    sf.name as funcionalidade,
    sc.name as categoria,
    p.action,
    COUNT(*) as total
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
LEFT JOIN permissions p ON sf.id = p.feature_id
GROUP BY sf.name, sc.name, p.action
ORDER BY sc.name, sf.name, p.action;

-- 7. CRIAR PERMISSÕES PARA system_features (se não existirem)
INSERT INTO permissions (feature_id, action, description)
SELECT 
    sf.id,
    'READ',
    'Permissão de leitura para ' || sf.name
FROM system_features sf
WHERE NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.feature_id = sf.id AND p.action = 'READ'
);

INSERT INTO permissions (feature_id, action, description)
SELECT 
    sf.id,
    'WRITE',
    'Permissão de escrita para ' || sf.name
FROM system_features sf
WHERE NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.feature_id = sf.id AND p.action = 'WRITE'
);

-- 8. ATRIBUIR PERMISSÕES AO SUPER ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id,
    p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'Super Admin'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- 9. VERIFICAR USUÁRIO ADMIN E ATRIBUIR ROLE
SELECT 
    'USUÁRIO ADMIN' as tipo,
    u.id,
    u.username,
    u.email,
    CASE WHEN ura.user_id IS NOT NULL THEN 'TEM ROLE' ELSE 'SEM ROLE' END as status
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
WHERE u.username = 'admin'
ORDER BY u.id;

-- 10. ATRIBUIR ROLE SUPER ADMIN AO USUÁRIO ADMIN (se não tiver)
INSERT INTO user_role_assignments (user_id, role_id)
SELECT 
    u.id,
    r.id
FROM users u
CROSS JOIN roles r
WHERE u.username = 'admin'
AND r.name = 'Super Admin'
AND NOT EXISTS (
    SELECT 1 FROM user_role_assignments ura 
    WHERE ura.user_id = u.id AND ura.role_id = r.id
);

-- 11. RESUMO FINAL
SELECT 
    'RESUMO RBAC' as tipo,
    'Roles criados: ' || (SELECT COUNT(*) FROM roles) as info
UNION ALL
SELECT 
    'RESUMO RBAC' as tipo,
    'Permissões criadas: ' || (SELECT COUNT(*) FROM permissions) as info
UNION ALL
SELECT 
    'RESUMO RBAC' as tipo,
    'Atribuições de roles: ' || (SELECT COUNT(*) FROM user_role_assignments) as info
UNION ALL
SELECT 
    'RESUMO RBAC' as tipo,
    'Atribuições de permissões: ' || (SELECT COUNT(*) FROM role_permissions) as info;


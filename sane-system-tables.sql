-- ========================================
-- SANEAMENTO COMPLETO DAS TABELAS SYSTEM_CATEGORIAS E SYSTEM_FEATURES
-- ========================================

-- 1. REMOVER DEPENDÊNCIAS PRIMEIRO
DELETE FROM permissions WHERE feature_id IN (SELECT id FROM system_features);
DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions WHERE feature_id IN (SELECT id FROM system_features));

-- 2. DROPAR TABELAS COMPLETAMENTE (para recriar com estrutura correta)
DROP TABLE IF EXISTS system_features CASCADE;
DROP TABLE IF EXISTS system_categorias CASCADE;

-- 3. RECRIAR TABELA SYSTEM_CATEGORIAS
CREATE TABLE system_categorias (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(100) DEFAULT 'CogIcon',
    color VARCHAR(7) DEFAULT '#6B7280',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

-- 4. RECRIAR TABELA SYSTEM_FEATURES (SEM COLUNA CATEGORY - APENAS CATEGORY_ID)
CREATE TABLE system_features (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES system_categorias(id) ON DELETE SET NULL,
    url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER
);

-- 5. CRIAR ÍNDICES
CREATE INDEX idx_system_categorias_slug ON system_categorias(slug);
CREATE INDEX idx_system_categorias_sort_order ON system_categorias(sort_order);
CREATE INDEX idx_system_features_category_id ON system_features(category_id);
CREATE INDEX idx_system_features_url ON system_features(url);

-- 6. INSERIR CATEGORIAS PADRÃO
INSERT INTO system_categorias (name, slug, description, icon, color, sort_order, is_active) VALUES
('Sistema', 'sistema', 'Funcionalidades do sistema', 'CogIcon', '#6B7280', 1, true),
('Permissões', 'permissoes', 'Gestão de permissões e segurança', 'LockClosedIcon', '#EF4444', 2, true),
('Administrativo', 'administrativo', 'Funções administrativas', 'ShieldCheckIcon', '#3B82F6', 3, true),
('Imóveis', 'imoveis', 'Gestão de imóveis', 'BuildingOfficeIcon', '#10B981', 4, true),
('Clientes', 'clientes', 'Gestão de clientes', 'UserIcon', '#8B5CF6', 5, true),
('Proprietários', 'proprietarios', 'Gestão de proprietários', 'UserGroupIcon', '#F59E0B', 6, true),
('Dashboard / Relatórios', 'dashboard-relatorios', 'Dashboards e relatórios', 'ChartBarIcon', '#06B6D4', 7, true);

-- 7. VERIFICAR CATEGORIAS INSERIDAS
SELECT id, name, slug, color, sort_order FROM system_categorias ORDER BY sort_order;

-- 8. CRIAR FUNCIONALIDADES BÁSICAS (você pode adicionar mais manualmente no pgAdmin4)
INSERT INTO system_features (name, description, category_id, url, is_active) VALUES
('Categorias de Funcionalidades', 'Gestão de categorias do sistema', 1, '/admin/categorias', true),
('Funcinalidades do Sistema', 'Gestão de funcionalidades do sistema', 1, '/admin/system-features', true),
('Hierarquia de Perfis', 'Gestão de hierarquia de perfis', 2, '/admin/hierarquia-perfis', true),
('Gestão de Perfis', 'Gestão de perfis', 2, '/admin/perfis', true),
('Gestão de permissões', 'Gestão de permissões', 2, '/admin/permissoes', true),
('Usuários', 'Gestão de usuários', 3, '/admin/usuarios', true),
('Categorias de Amenidades', 'Gestão de categorias de amenidades', 3, '/admin/categorias-amenidades', true),
('Amenidades', 'Gestão de amenidades', 3, '/admin/amenidades', true),
('Categorias de Proximidades', 'Gestão de categorias de proximidades', 3, '/admin/categorias-proximidades', true),
('Proximidades', 'Gestão de proximidades', 3, '/admin/proximidades', true),
('Tipos de Documentos', 'Gestão de tipos de documentos', 3, '/admin/categorias-tipos-documentos', true),
('Tipos de Imóveis', 'Gestão de tipos de imóveis', 4, '/admin/tipos-imoveis', true),
('Finalidades de Imóveis', 'Gestão de finalidades de imóveis', 4, '/admin/finalidades-imoveis', true),
('Status de Imóveis', 'Gestão de status de imóveis', 4, '/admin/status-imoveis', true),
('Mudança de Status', 'Gestão de mudança de status', 4, '/admin/mudanca-status', true),
('Imóveis', 'Gestão de imóveis', 4, '/admin/imoveis', true),
('Clientes', 'Gestão de clientes', 5, '/admin/clientes', true),
('Proprietários', 'Gestão de proprietários', 6, '/admin/proprietarios', true),
('Dashboard', 'Dashboard principal', 7, '/admin/dashboard', true),
('Relatórios', 'Relatórios', 7, '/admin/relatorios', true);

-- 9. VERIFICAR FUNCIONALIDADES INSERIDAS
SELECT sf.id, sf.name, sf.url, sc.name as category_name, sc.color 
FROM system_features sf
JOIN system_categorias sc ON sf.category_id = sc.id
ORDER BY sc.sort_order, sf.name;

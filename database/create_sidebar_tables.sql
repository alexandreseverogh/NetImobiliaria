-- ============================================================
-- CRIAÇÃO DE TABELAS PARA SIDEBAR DINÂMICA
-- Refatoração: Sidebar e Permissões
-- Data: 26/10/2025
-- ============================================================

-- =========================================
-- 1. TABELA: sidebar_menu_items
-- =========================================
-- Armazena os itens do menu da sidebar
-- Permite estrutura hierárquica (menus e submenus)

CREATE TABLE IF NOT EXISTS sidebar_menu_items (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES sidebar_menu_items(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    icon_name VARCHAR(100) NOT NULL,
    url VARCHAR(500),
    resource VARCHAR(100),
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    roles_required JSONB, -- ['Super Admin', 'Administrador']
    permission_required VARCHAR(100),
    permission_action VARCHAR(50), -- 'READ', 'WRITE', 'DELETE', etc
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT fk_sidebar_menu_items_parent FOREIGN KEY (parent_id) 
        REFERENCES sidebar_menu_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_sidebar_menu_items_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_sidebar_menu_items_updated_by FOREIGN KEY (updated_by) 
        REFERENCES users(id) ON DELETE SET NULL
);

-- =========================================
-- 2. TABELA: sidebar_menu_versions
-- =========================================
-- Armazena versões/histórico do menu
-- Permite A/B testing e rollback

CREATE TABLE IF NOT EXISTS sidebar_menu_versions (
    id SERIAL PRIMARY KEY,
    version_name VARCHAR(100) NOT NULL UNIQUE,
    menu_structure JSONB NOT NULL,
    is_active BOOLEAN DEFAULT false,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT fk_sidebar_menu_versions_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL
);

-- =========================================
-- ÍNDICES PARA PERFORMANCE
-- =========================================

-- sidebar_menu_items
CREATE INDEX IF NOT EXISTS idx_sidebar_menu_items_parent 
    ON sidebar_menu_items(parent_id);
    
CREATE INDEX IF NOT EXISTS idx_sidebar_menu_items_active 
    ON sidebar_menu_items(is_active);
    
CREATE INDEX IF NOT EXISTS idx_sidebar_menu_items_order 
    ON sidebar_menu_items(order_index);
    
CREATE INDEX IF NOT EXISTS idx_sidebar_menu_items_created_by 
    ON sidebar_menu_items(created_by);
    
-- Índice GIN para busca em JSONB (roles_required)
CREATE INDEX IF NOT EXISTS idx_sidebar_menu_items_roles 
    ON sidebar_menu_items USING GIN (roles_required);

-- sidebar_menu_versions
CREATE INDEX IF NOT EXISTS idx_sidebar_menu_versions_active 
    ON sidebar_menu_versions(is_active);
    
CREATE INDEX IF NOT EXISTS idx_sidebar_menu_versions_created_at 
    ON sidebar_menu_versions(created_at DESC);

-- =========================================
-- TRIGGERS
-- =========================================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_sidebar_menu_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sidebar_menu_items_updated_at
    BEFORE UPDATE ON sidebar_menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sidebar_menu_items_timestamp();

-- =========================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- =========================================

COMMENT ON TABLE sidebar_menu_items IS 'Itens do menu da sidebar - estrutura hierárquica';
COMMENT ON COLUMN sidebar_menu_items.parent_id IS 'ID do item pai (NULL para itens raiz)';
COMMENT ON COLUMN sidebar_menu_items.name IS 'Nome do item do menu';
COMMENT ON COLUMN sidebar_menu_items.icon_name IS 'Nome do ícone (ex: home, building, users)';
COMMENT ON COLUMN sidebar_menu_items.url IS 'URL de destino';
COMMENT ON COLUMN sidebar_menu_items.resource IS 'Nome do recurso para controle de permissão';
COMMENT ON COLUMN sidebar_menu_items.order_index IS 'Ordem de exibição';
COMMENT ON COLUMN sidebar_menu_items.is_active IS 'Se está ativo';
COMMENT ON COLUMN sidebar_menu_items.roles_required IS 'Roles necessárias em formato JSONB';
COMMENT ON COLUMN sidebar_menu_items.permission_required IS 'Nome da permissão necessária';
COMMENT ON COLUMN sidebar_menu_items.permission_action IS 'Ação da permissão (READ, WRITE, etc)';

COMMENT ON TABLE sidebar_menu_versions IS 'Versões/histórico do menu';
COMMENT ON COLUMN sidebar_menu_versions.version_name IS 'Nome da versão';
COMMENT ON COLUMN sidebar_menu_versions.menu_structure IS 'Estrutura completa do menu em JSONB';
COMMENT ON COLUMN sidebar_menu_versions.is_active IS 'Se esta versão está ativa';

-- =========================================
-- VALIDAÇÃO: Garantir que apenas uma versão está ativa
-- =========================================

CREATE OR REPLACE FUNCTION ensure_single_active_version()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_active = true THEN
        UPDATE sidebar_menu_versions 
        SET is_active = false 
        WHERE id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sidebar_menu_versions_single_active
    BEFORE INSERT OR UPDATE ON sidebar_menu_versions
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_active_version();

-- =========================================
-- PRONTO PARA USO!
-- =========================================

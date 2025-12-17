-- ============================================================
-- MIGRATION 003: Criar tabela sidebar_item_roles
-- Data: 2025-10-29
-- Objetivo: Normalizar roles_required de JSONB para M:N
-- ============================================================

-- 1. CRIAR TABELA M:N
CREATE TABLE IF NOT EXISTS sidebar_item_roles (
    id SERIAL PRIMARY KEY,
    sidebar_item_id INTEGER REFERENCES sidebar_menu_items(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES user_roles(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    UNIQUE(sidebar_item_id, role_id)
);

-- 2. CRIAR ÍNDICES
CREATE INDEX idx_sidebar_roles_item ON sidebar_item_roles(sidebar_item_id);
CREATE INDEX idx_sidebar_roles_role ON sidebar_item_roles(role_id);

-- 3. POPULAR com dados do JSONB (se roles_required existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sidebar_menu_items' 
        AND column_name = 'roles_required'
    ) THEN
        INSERT INTO sidebar_item_roles (sidebar_item_id, role_id)
        SELECT 
            smi.id,
            ur.id
        FROM sidebar_menu_items smi
        CROSS JOIN LATERAL jsonb_array_elements_text(smi.roles_required) AS role_name
        JOIN user_roles ur ON ur.name = role_name
        ON CONFLICT (sidebar_item_id, role_id) DO NOTHING;
        
        RAISE NOTICE 'Dados migrados de roles_required para sidebar_item_roles';
    ELSE
        RAISE NOTICE 'Coluna roles_required não existe, pulando migração de dados';
    END IF;
END $$;

-- 4. COMENTÁRIOS
COMMENT ON TABLE sidebar_item_roles IS 
    'Associação M:N entre itens da sidebar e perfis - substitui JSONB roles_required';

-- 5. VERIFICAÇÃO
SELECT 
    'Migration 003 concluída' as status,
    COUNT(*) as total_associacoes
FROM sidebar_item_roles;

-- ============================================================
-- MIGRATION 003 CONCLUÍDA
-- ============================================================




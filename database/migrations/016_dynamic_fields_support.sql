-- Migração para suporte a campos dinâmicos por perfil
-- 1. Tabela de definições dos campos customizados
CREATE TABLE IF NOT EXISTS role_custom_fields (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES user_roles(id) ON DELETE CASCADE,
    field_name VARCHAR(50) NOT NULL,
    field_label VARCHAR(100) NOT NULL,
    field_type VARCHAR(20) NOT NULL DEFAULT 'text',
    mask VARCHAR(50),
    is_required BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, field_name)
);

-- 2. Adicionar coluna JSONB na tabela users para guardar os valores preenchidos
ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

-- 3. Trigger para updated_at na nova tabela
CREATE TRIGGER update_role_custom_fields_updated_at 
    BEFORE UPDATE ON role_custom_fields
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentários explicativos
COMMENT ON TABLE role_custom_fields IS 'Definições de campos extras exigidos para cada perfil de usuário';
COMMENT ON COLUMN users.custom_data IS 'Dados dinâmicos preenchidos com base no perfil (ex: CRECI, CRM, etc)';

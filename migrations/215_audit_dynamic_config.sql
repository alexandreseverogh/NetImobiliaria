-- ============================================================
-- MIGRATION 215: AUDIT DYNAMIC CONFIGURATION
-- ============================================================
-- Objetivo: Desacoplar o enriquecimento de auditoria e permitir
-- que o MASTER gerencie quais tabelas são visualizadas e como.
-- ============================================================

-- 1. Tabela de Configurações de Auditoria
CREATE TABLE IF NOT EXISTS system_audit_configs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL UNIQUE,
    feature_id INTEGER REFERENCES system_features(id) ON DELETE CASCADE,
    enrichment_type VARCHAR(20) DEFAULT 'UNIVERSAL' CHECK (enrichment_type IN ('NONE', 'UNIVERSAL', 'PREMIUM')),
    premium_component_id VARCHAR(100), -- ID do componente no Registry do frontend
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Função para Descoberta Automática de Tabelas (Information Schema)
CREATE OR REPLACE FUNCTION get_available_database_tables()
RETURNS TABLE(table_name text) AS $$
BEGIN
    RETURN QUERY
    SELECT t.table_name::text
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT IN ('migrations', 'spatial_ref_sys') -- Ignorar tabelas técnicas
    ORDER BY t.table_name;
END;
$$ LANGUAGE plpgsql;

-- 3. Auto-Provisionamento Inicial (Retrocompatibilidade)
-- Mapear a tabela 'imoveis' para o componente PREMIUM que já temos
INSERT INTO system_audit_configs (table_name, feature_id, enrichment_type, premium_component_id)
SELECT 'imoveis', id, 'PREMIUM', 'imovel-audit-card'
FROM system_features 
WHERE slug = 'imoveis'
ON CONFLICT (table_name) DO UPDATE 
SET enrichment_type = 'PREMIUM', premium_component_id = 'imovel-audit-card';

-- 4. Gatilho para atualizar updated_at
CREATE OR REPLACE FUNCTION update_audit_config_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_audit_config_timestamp
BEFORE UPDATE ON system_audit_configs
FOR EACH ROW
EXECUTE FUNCTION update_audit_config_timestamp();

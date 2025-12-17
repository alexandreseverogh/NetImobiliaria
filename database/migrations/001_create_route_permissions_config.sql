-- ============================================================
-- MIGRATION 001: Criar tabela route_permissions_config
-- Data: 2025-10-29
-- Objetivo: Eliminar hardcoding de rotas no middleware
-- ============================================================

-- ============================================================
-- 1. CRIAR TABELA route_permissions_config
-- ============================================================

CREATE TABLE IF NOT EXISTS route_permissions_config (
    id SERIAL PRIMARY KEY,
    
    -- Configuração da rota
    route_pattern VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL DEFAULT 'GET',
    
    -- Vinculação com funcionalidade
    feature_id INTEGER REFERENCES system_features(id) ON DELETE CASCADE,
    
    -- Permissão necessária
    default_action VARCHAR(20) NOT NULL,
    
    -- Configurações de segurança
    requires_auth BOOLEAN NOT NULL DEFAULT true,
    requires_2fa BOOLEAN NOT NULL DEFAULT false,
    
    -- Controle
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Auditoria
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT unique_route_method UNIQUE(route_pattern, method),
    CONSTRAINT valid_method CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
    CONSTRAINT valid_action CHECK (default_action IN ('READ', 'WRITE', 'DELETE', 'ADMIN', 'EXECUTE'))
);

-- ============================================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX idx_route_config_pattern ON route_permissions_config(route_pattern);
CREATE INDEX idx_route_config_feature ON route_permissions_config(feature_id);
CREATE INDEX idx_route_config_active ON route_permissions_config(is_active);
CREATE INDEX idx_route_config_pattern_method ON route_permissions_config(route_pattern, method);

-- ============================================================
-- 3. CRIAR TRIGGER PARA updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_route_permissions_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_route_permissions_config_updated_at
    BEFORE UPDATE ON route_permissions_config
    FOR EACH ROW
    EXECUTE FUNCTION update_route_permissions_config_updated_at();

-- ============================================================
-- 4. ADICIONAR COMENTÁRIOS
-- ============================================================

COMMENT ON TABLE route_permissions_config IS 
    'Configuração dinâmica de permissões por rota - elimina hardcoding de routePermissions';

COMMENT ON COLUMN route_permissions_config.route_pattern IS 
    'Padrão da rota (ex: /admin/imoveis ou /api/admin/imoveis/[id])';

COMMENT ON COLUMN route_permissions_config.method IS 
    'Método HTTP (GET, POST, PUT, DELETE)';

COMMENT ON COLUMN route_permissions_config.feature_id IS 
    'FK para system_features - qual funcionalidade esta rota protege';

COMMENT ON COLUMN route_permissions_config.default_action IS 
    'Ação padrão necessária (READ, WRITE, DELETE, ADMIN, EXECUTE)';

COMMENT ON COLUMN route_permissions_config.requires_2fa IS 
    'Se true, usuário deve ter 2FA verificado para acessar esta rota';

-- ============================================================
-- 5. VERIFICAÇÃO
-- ============================================================

-- Verificar se tabela foi criada
SELECT 
    'Tabela route_permissions_config criada' as status,
    COUNT(*) as total_colunas
FROM information_schema.columns
WHERE table_name = 'route_permissions_config';

-- Verificar índices
SELECT 
    'Índices criados' as status,
    COUNT(*) as total_indices
FROM pg_indexes
WHERE tablename = 'route_permissions_config';

-- Verificar triggers
SELECT 
    'Triggers criados' as status,
    COUNT(*) as total_triggers
FROM pg_trigger
WHERE tgrelid = 'route_permissions_config'::regclass;

-- ============================================================
-- MIGRATION 001 CONCLUÍDA
-- ============================================================


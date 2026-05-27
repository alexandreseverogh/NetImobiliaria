-- Migration 212: Isolamento de Tenant em Configurações Globais
-- Objetivo: Permitir que cada imobiliária tenha seus próprios parâmetros de distribuição de leads e configurações de segmentos.

BEGIN;

-- 1. Tabela parametros
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Se houver 1 registro global, vamos associá-lo ao tenant padrão ou duplicar para todos?
-- Vamos associar ao tenant 00000000-0000-0000-0000-000000000001 (Padrão)
UPDATE parametros SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- Criar índice
CREATE INDEX IF NOT EXISTS idx_parametros_tenant ON parametros(tenant_id);


-- 2. Tabela config_segmentos
ALTER TABLE config_segmentos ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Associar ao tenant padrão
UPDATE config_segmentos SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_config_segmentos_tenant ON config_segmentos(tenant_id);


-- 3. Tabela config_segmentos_inteligencia
ALTER TABLE config_segmentos_inteligencia ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Associar ao tenant padrão
UPDATE config_segmentos_inteligencia SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_config_segmentos_inteligencia_tenant ON config_segmentos_inteligencia(tenant_id);

COMMIT;

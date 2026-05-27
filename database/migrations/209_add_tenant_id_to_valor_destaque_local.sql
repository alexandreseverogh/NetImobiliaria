-- Migration: Adicionar tenant_id à tabela valor_destaque_local
-- Objetivo: Permitir isolamento de valores de destaque por tenant

-- 1. Adicionar coluna tenant_id
ALTER TABLE valor_destaque_local ADD COLUMN tenant_id UUID;

-- 2. Atualizar registros existentes para o tenant do sistema (Master)
UPDATE valor_destaque_local SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- 3. Tornar a coluna obrigatória
ALTER TABLE valor_destaque_local ALTER COLUMN tenant_id SET NOT NULL;

-- 4. Remover constraint única antiga
ALTER TABLE valor_destaque_local DROP CONSTRAINT IF EXISTS valor_destaque_local_estado_fk_cidade_fk_key;

-- 5. Adicionar nova constraint única incluindo tenant_id
ALTER TABLE valor_destaque_local ADD CONSTRAINT valor_destaque_local_tenant_estado_cidade_unique UNIQUE (tenant_id, estado_fk, cidade_fk);

-- 6. Adicionar índice para performance
CREATE INDEX IF NOT EXISTS idx_valor_destaque_local_tenant ON valor_destaque_local(tenant_id);

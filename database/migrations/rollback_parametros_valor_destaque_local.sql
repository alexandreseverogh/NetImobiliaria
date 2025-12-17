-- Rollback: Remover tabelas Parametros e Valor_Destaque_Local
-- Data: 2025-01-XX
-- Descrição: Remove as tabelas criadas pela migration create_parametros_valor_destaque_local.sql
-- 
-- ATENÇÃO: Este script irá remover TODOS os dados das tabelas!
-- Execute apenas se tiver certeza de que deseja reverter a migration.

BEGIN;

-- Remover trigger primeiro
DROP TRIGGER IF EXISTS trigger_update_valor_destaque_local_updated_at ON "Valor_Destaque_Local";

-- Remover função do trigger
DROP FUNCTION IF EXISTS update_valor_destaque_local_updated_at();

-- Remover índices
DROP INDEX IF EXISTS idx_valor_destaque_local_estado_cidade;
DROP INDEX IF EXISTS idx_valor_destaque_local_cidade;
DROP INDEX IF EXISTS idx_valor_destaque_local_estado;

-- Remover tabelas
DROP TABLE IF EXISTS "Valor_Destaque_Local";
DROP TABLE IF EXISTS "Parametros";

COMMIT;

-- Verificação pós-remoção
SELECT 'Tabelas removidas com sucesso!' AS status;


-- ============================================================
-- ROLLBACK 001: Remover tabela route_permissions_config
-- Data: 2025-10-29
-- ============================================================

-- ============================================================
-- ATENÇÃO: Este script desfaz a migration 001
-- Use apenas se precisar reverter as alterações
-- ============================================================

-- 1. Dropar tabela (cascade remove índices e triggers)
DROP TABLE IF EXISTS route_permissions_config CASCADE;

-- 2. Dropar função do trigger se existir
DROP FUNCTION IF EXISTS update_route_permissions_config_updated_at() CASCADE;

-- 3. Verificação
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'Tabela route_permissions_config removida com sucesso'
        ELSE 'ERRO: Tabela ainda existe'
    END as status
FROM information_schema.tables
WHERE table_name = 'route_permissions_config';

-- ============================================================
-- ROLLBACK 001 CONCLUÍDO
-- ============================================================



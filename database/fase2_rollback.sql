-- ================================================================
-- FASE 2: ROLLBACK - Reverter Migração UUID
-- Data: 2025-11-06
-- Objetivo: Reverter adição de colunas UUID se necessário
-- ================================================================

BEGIN;

-- Remover FK de imoveis
ALTER TABLE imoveis 
  DROP CONSTRAINT IF EXISTS fk_imoveis_proprietario_uuid CASCADE;

-- Remover índices
DROP INDEX IF EXISTS idx_imoveis_proprietario_uuid;
DROP INDEX IF EXISTS idx_clientes_uuid_unique;
DROP INDEX IF EXISTS idx_proprietarios_uuid_unique;

-- Remover colunas UUID
ALTER TABLE imoveis DROP COLUMN IF EXISTS proprietario_uuid CASCADE;
ALTER TABLE clientes DROP COLUMN IF EXISTS uuid CASCADE;
ALTER TABLE proprietarios DROP COLUMN IF EXISTS uuid CASCADE;

COMMIT;

SELECT '================================';
SELECT 'ROLLBACK FASE 2 COMPLETO';
SELECT 'Sistema revertido para INTEGER apenas';
SELECT 'Tabelas voltaram ao estado da FASE 1';
SELECT '================================';

-- ================================================================
-- FIM DO ROLLBACK
-- ================================================================



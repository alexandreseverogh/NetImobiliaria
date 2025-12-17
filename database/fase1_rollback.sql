-- ================================================================
-- FASE 1: ROLLBACK - Reverter Centralização de 2FA
-- Data: 2025-01-06
-- Objetivo: Reverter mudanças da FASE 1 se necessário
-- ================================================================

BEGIN;

-- ================================================================
-- ROLLBACK CHECKPOINT 3: Remover Colunas de Auditoria
-- ================================================================

-- Remover dados migrados de audit_2fa_logs_public
DELETE FROM audit_logs 
WHERE user_id_int IS NOT NULL 
AND user_type IN ('cliente', 'proprietario');

-- Remover colunas adicionadas
ALTER TABLE audit_logs 
  DROP CONSTRAINT IF EXISTS check_audit_user_id,
  DROP COLUMN IF EXISTS user_id_int CASCADE,
  DROP COLUMN IF EXISTS user_type CASCADE;

-- Remover índices
DROP INDEX IF EXISTS idx_audit_logs_user_type;
DROP INDEX IF EXISTS idx_audit_logs_user_id_int;
DROP INDEX IF EXISTS idx_audit_logs_composite;

RAISE NOTICE '✅ ROLLBACK CHECKPOINT 3: Auditoria revertida';

-- ================================================================
-- ROLLBACK CHECKPOINT 2: Remover Dados Migrados
-- ================================================================

-- Remover dados de clientes
DELETE FROM user_2fa_codes 
WHERE user_type = 'cliente' AND user_id_int IS NOT NULL;

DELETE FROM user_2fa_config 
WHERE user_type = 'cliente' AND user_id_int IS NOT NULL;

-- Remover dados de proprietários
DELETE FROM user_2fa_codes 
WHERE user_type = 'proprietario' AND user_id_int IS NOT NULL;

DELETE FROM user_2fa_config 
WHERE user_type = 'proprietario' AND user_id_int IS NOT NULL;

RAISE NOTICE '✅ ROLLBACK CHECKPOINT 2: Dados migrados removidos';

-- ================================================================
-- ROLLBACK CHECKPOINT 1: Remover Colunas Adicionadas
-- ================================================================

-- Remover constraints
ALTER TABLE user_2fa_codes 
  DROP CONSTRAINT IF EXISTS check_user_id_2fa_codes;

ALTER TABLE user_2fa_config 
  DROP CONSTRAINT IF EXISTS check_user_id_2fa_config;

-- Remover índices
DROP INDEX IF EXISTS idx_user_2fa_codes_user_id_int;
DROP INDEX IF EXISTS idx_user_2fa_codes_user_type;
DROP INDEX IF EXISTS idx_user_2fa_codes_composite;

DROP INDEX IF EXISTS idx_user_2fa_config_user_id_int;
DROP INDEX IF EXISTS idx_user_2fa_config_user_type;
DROP INDEX IF EXISTS idx_user_2fa_config_composite;

-- Remover colunas
ALTER TABLE user_2fa_codes 
  DROP COLUMN IF EXISTS user_id_int CASCADE,
  DROP COLUMN IF EXISTS user_type CASCADE;

ALTER TABLE user_2fa_config 
  DROP COLUMN IF EXISTS user_id_int CASCADE,
  DROP COLUMN IF EXISTS user_type CASCADE;

RAISE NOTICE '✅ ROLLBACK CHECKPOINT 1: Colunas removidas';

COMMIT;

RAISE NOTICE '================================';
RAISE NOTICE '✅ ROLLBACK COMPLETO';
RAISE NOTICE 'Sistema revertido ao estado anterior à FASE 1';
RAISE NOTICE 'Tabelas temporárias continuam funcionando';
RAISE NOTICE '================================';

-- ================================================================
-- FIM DO ROLLBACK
-- ================================================================



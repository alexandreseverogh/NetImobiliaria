-- ================================================================
-- FASE 1 - CLEANUP: Deletar Tabelas Temporárias
-- Data: 2025-11-06
-- Objetivo: Remover tabelas temporárias após migração bem-sucedida
-- ATENÇÃO: Só executar após validar que sistema público funciona!
-- ================================================================

BEGIN;

-- Verificar se há dados não migrados
DO $$
DECLARE
  count_clientes_codes INTEGER;
  count_clientes_config INTEGER;
  count_proprietarios_codes INTEGER;
  count_proprietarios_config INTEGER;
  count_audit_public INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_clientes_codes FROM clientes_2fa_codes;
  SELECT COUNT(*) INTO count_clientes_config FROM clientes_2fa_config;
  SELECT COUNT(*) INTO count_proprietarios_codes FROM proprietarios_2fa_codes;
  SELECT COUNT(*) INTO count_proprietarios_config FROM proprietarios_2fa_config;
  SELECT COUNT(*) INTO count_audit_public FROM audit_2fa_logs_public;
  
  RAISE NOTICE '================================';
  RAISE NOTICE 'VERIFICAÇÃO ANTES DE DELETAR:';
  RAISE NOTICE '================================';
  RAISE NOTICE 'clientes_2fa_codes: % registros', count_clientes_codes;
  RAISE NOTICE 'clientes_2fa_config: % registros', count_clientes_config;
  RAISE NOTICE 'proprietarios_2fa_codes: % registros', count_proprietarios_codes;
  RAISE NOTICE 'proprietarios_2fa_config: % registros', count_proprietarios_config;
  RAISE NOTICE 'audit_2fa_logs_public: % registros', count_audit_public;
  RAISE NOTICE '================================';
  
  IF count_clientes_codes > 0 OR count_proprietarios_codes > 0 THEN
    RAISE WARNING 'ATENÇÃO: Há códigos 2FA não migrados! Verificar antes de deletar.';
  END IF;
END $$;

-- Deletar tabelas temporárias
DROP TABLE IF EXISTS clientes_2fa_codes CASCADE;
DROP TABLE IF EXISTS clientes_2fa_config CASCADE;
DROP TABLE IF EXISTS proprietarios_2fa_codes CASCADE;
DROP TABLE IF EXISTS proprietarios_2fa_config CASCADE;
DROP TABLE IF EXISTS audit_2fa_logs_public CASCADE;

COMMIT;

SELECT '================================';
SELECT 'TABELAS TEMPORÁRIAS DELETADAS';
SELECT 'Sistema agora usa apenas:';
SELECT '- user_2fa_codes (centralizado)';
SELECT '- user_2fa_config (centralizado)';
SELECT '- audit_logs (centralizado)';
SELECT '================================';

-- ================================================================
-- FIM DO CLEANUP
-- ================================================================



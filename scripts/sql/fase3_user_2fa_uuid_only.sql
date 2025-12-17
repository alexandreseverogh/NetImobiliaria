-- ============================================================
-- Fase 3.1 – Ajuste user_2fa_* para aceitar UUID exclusivo
-- Objetivo: permitir que clientes/proprietários usem apenas UUID
--           sem dependência de user_id_int.
-- Pré-condições:
--   - user_2fa_codes.user_id IS NOT NULL (>= 0 registros)
--   - user_2fa_config.user_id IS NOT NULL (>= 0 registros)
--   - Inventários atualizados (Autenticação / 2FA)
-- ============================================================

BEGIN;

SET search_path TO public;

-- ------------------------------------------------------------
-- 1) Diagnósticos rápidos (evidências pós-execução)
-- ------------------------------------------------------------
SELECT COUNT(*) AS codes_sem_uuid
FROM user_2fa_codes
WHERE user_id IS NULL;

SELECT COUNT(*) AS config_sem_uuid
FROM user_2fa_config
WHERE user_id IS NULL;

-- ------------------------------------------------------------
-- 2) Ajustar constraints para permitir UUID único
-- ------------------------------------------------------------

-- user_2fa_codes
ALTER TABLE user_2fa_codes
  DROP CONSTRAINT IF EXISTS check_user_id_2fa_codes;

ALTER TABLE user_2fa_codes
  ADD CONSTRAINT chk_user_2fa_codes_identity
  CHECK (
    (user_type = 'admin' AND user_id IS NOT NULL AND user_id_int IS NULL)
    OR
    (user_type IN ('cliente', 'proprietario') AND user_id IS NOT NULL)
  ) NOT VALID;

ALTER TABLE user_2fa_codes
  VALIDATE CONSTRAINT chk_user_2fa_codes_identity;

-- user_2fa_config
ALTER TABLE user_2fa_config
  DROP CONSTRAINT IF EXISTS check_user_id_2fa_config;

ALTER TABLE user_2fa_config
  ADD CONSTRAINT chk_user_2fa_config_identity
  CHECK (
    (user_type = 'admin' AND user_id IS NOT NULL AND user_id_int IS NULL)
    OR
    (user_type IN ('cliente', 'proprietario') AND user_id IS NOT NULL)
  ) NOT VALID;

ALTER TABLE user_2fa_config
  VALIDATE CONSTRAINT chk_user_2fa_config_identity;

-- ------------------------------------------------------------
-- 3) Observação: user_id_int será removido em fase posterior.
--    Até lá, mantemos os dados existentes para auditoria.
-- ------------------------------------------------------------

COMMIT;

-- ------------------------------------------------------------
-- Rollback (executar em caso de falha grave)
-- ------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE user_2fa_codes
--   DROP CONSTRAINT IF EXISTS chk_user_2fa_codes_identity;
-- ALTER TABLE user_2fa_codes
--   ADD CONSTRAINT check_user_id_2fa_codes
--   CHECK (
--     (user_id IS NOT NULL AND user_type = 'admin')
--     OR
--     (user_id_int IS NOT NULL AND user_type IN ('cliente', 'proprietario'))
--   );
--
-- ALTER TABLE user_2fa_config
--   DROP CONSTRAINT IF EXISTS chk_user_2fa_config_identity;
-- ALTER TABLE user_2fa_config
--   ADD CONSTRAINT check_user_id_2fa_config
--   CHECK (
--     (user_id IS NOT NULL AND user_type = 'admin')
--     OR
--     (user_id_int IS NOT NULL AND user_type IN ('cliente', 'proprietario'))
--   );
-- COMMIT;


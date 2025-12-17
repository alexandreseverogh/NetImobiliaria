-- ============================================================
-- Fase 4 – Remover colunas user_id_int das tabelas user_2fa_*
-- Objetivo: concluir migração UUID eliminando legados INTEGER
-- Pré-condições:
--   * `SELECT COUNT(*) FROM user_2fa_codes WHERE user_id IS NULL;` = 0
--   * `SELECT COUNT(*) FROM user_2fa_config WHERE user_id IS NULL;` = 0
--   * Aprovação Guardian + backup (`pg_dump`) das tabelas envolvidas
-- ============================================================

BEGIN;

SET search_path TO public;

-- ------------------------------------------------------------
-- 1) Diagnósticos (registrar no log antes de alterações)
-- ------------------------------------------------------------
SELECT COUNT(*) AS codes_com_user_id_int
FROM user_2fa_codes
WHERE user_id_int IS NOT NULL;

SELECT COUNT(*) AS config_com_user_id_int
FROM user_2fa_config
WHERE user_id_int IS NOT NULL;

SELECT COUNT(*) AS codes_sem_uuid
FROM user_2fa_codes
WHERE user_id IS NULL;

SELECT COUNT(*) AS config_sem_uuid
FROM user_2fa_config
WHERE user_id IS NULL;

-- Caso haja registros com UUID ausente, ABORTAR e tratar antes.

-- ------------------------------------------------------------
-- 2) Normalização (garantir que colunas legadas estejam nulas)
-- ------------------------------------------------------------
UPDATE user_2fa_codes
SET user_id_int = NULL
WHERE user_id_int IS NOT NULL;

UPDATE user_2fa_config
SET user_id_int = NULL
WHERE user_id_int IS NOT NULL;

-- ------------------------------------------------------------
-- 3) Remover índices/constraints dependentes do campo legado
-- ------------------------------------------------------------
-- user_2fa_codes
DROP INDEX IF EXISTS idx_user_2fa_codes_composite;
DROP INDEX IF EXISTS idx_user_2fa_codes_user_id_int;

ALTER TABLE user_2fa_codes
  DROP CONSTRAINT IF EXISTS chk_user_2fa_codes_identity;

-- user_2fa_config
DROP INDEX IF EXISTS idx_user_2fa_config_composite;
DROP INDEX IF EXISTS idx_user_2fa_config_user_id_int;

ALTER TABLE user_2fa_config
  DROP CONSTRAINT IF EXISTS chk_user_2fa_config_identity;

-- ------------------------------------------------------------
-- 4) Remover colunas legadas
-- ------------------------------------------------------------
ALTER TABLE user_2fa_codes
  DROP COLUMN IF EXISTS user_id_int;

ALTER TABLE user_2fa_config
  DROP COLUMN IF EXISTS user_id_int;

-- ------------------------------------------------------------
-- 5) Recriar constraints coerentes com UUID-only
-- ------------------------------------------------------------
ALTER TABLE user_2fa_codes
  ADD CONSTRAINT chk_user_2fa_codes_identity
  CHECK (
    (user_type = 'admin' AND user_id IS NOT NULL)
    OR
    (user_type IN ('cliente','proprietario') AND user_id IS NOT NULL)
  ) NOT VALID;

ALTER TABLE user_2fa_codes
  VALIDATE CONSTRAINT chk_user_2fa_codes_identity;

ALTER TABLE user_2fa_config
  ADD CONSTRAINT chk_user_2fa_config_identity
  CHECK (
    (user_type = 'admin' AND user_id IS NOT NULL)
    OR
    (user_type IN ('cliente','proprietario') AND user_id IS NOT NULL)
  ) NOT VALID;

ALTER TABLE user_2fa_config
  VALIDATE CONSTRAINT chk_user_2fa_config_identity;

-- Índices existentes (`idx_user_2fa_codes_user_type`, `idx_user_2fa_codes_user_id`,
-- `idx_user_2fa_config_user_type`, `idx_user_2fa_config_user_id`) permanecem válidos.

COMMIT;

-- ------------------------------------------------------------
-- ROLLBACK (executar apenas em ambiente controlado)
-- ------------------------------------------------------------
-- BEGIN;
-- ALTER TABLE user_2fa_codes
--   DROP CONSTRAINT IF EXISTS chk_user_2fa_codes_identity;
-- ALTER TABLE user_2fa_codes
--   ADD COLUMN user_id_int INTEGER;
-- CREATE INDEX idx_user_2fa_codes_user_id_int ON user_2fa_codes (user_id_int);
-- CREATE INDEX idx_user_2fa_codes_composite ON user_2fa_codes (user_id_int, user_type);
-- ALTER TABLE user_2fa_codes
--   ADD CONSTRAINT chk_user_2fa_codes_identity
--   CHECK (
--     (user_type = 'admin' AND user_id IS NOT NULL)
--     OR
--     (user_type IN ('cliente','proprietario') AND (user_id IS NOT NULL OR user_id_int IS NOT NULL))
--   );
--
-- ALTER TABLE user_2fa_config
--   DROP CONSTRAINT IF EXISTS chk_user_2fa_config_identity;
-- ALTER TABLE user_2fa_config
--   ADD COLUMN user_id_int INTEGER;
-- CREATE INDEX idx_user_2fa_config_user_id_int ON user_2fa_config (user_id_int);
-- CREATE INDEX idx_user_2fa_config_composite ON user_2fa_config (user_id_int, user_type);
-- ALTER TABLE user_2fa_config
--   ADD CONSTRAINT chk_user_2fa_config_identity
--   CHECK (
--     (user_type = 'admin' AND user_id IS NOT NULL)
--     OR
--     (user_type IN ('cliente','proprietario') AND (user_id IS NOT NULL OR user_id_int IS NOT NULL))
--   );
-- COMMIT;


\echo 'Iniciando validações em audit_logs...'

SELECT COUNT(*) AS registros_sem_tipo_admin
FROM audit_logs
WHERE user_id IS NOT NULL
  AND (user_type IS NULL OR TRIM(user_type) = '');

SELECT COUNT(*) AS registros_publicos_sem_uuid
FROM audit_logs
WHERE user_id IS NULL
  AND user_type IN ('cliente', 'proprietario')
  AND public_user_uuid IS NULL;

SELECT COUNT(*) AS registros_com_user_id_int
FROM audit_logs
WHERE user_id_int IS NOT NULL;

\echo 'Atualizando user_type para eventos administrativos...'

UPDATE audit_logs
SET user_type = 'admin'
WHERE user_id IS NOT NULL
  AND (user_type IS NULL OR TRIM(user_type) = '');

\echo 'Criando índice em public_user_uuid...'

CREATE INDEX IF NOT EXISTS idx_audit_logs_public_user_uuid
  ON audit_logs (public_user_uuid);

\echo 'Removendo coluna legada user_id_int...'

ALTER TABLE audit_logs
  DROP COLUMN IF EXISTS user_id_int;

\echo 'Adicionando constraint de consistência (admin sempre com user_id)...'

ALTER TABLE audit_logs
  DROP CONSTRAINT IF EXISTS chk_audit_logs_user_identity;

ALTER TABLE audit_logs
  ADD CONSTRAINT chk_audit_logs_user_identity
  CHECK (
    NOT (user_type = 'admin' AND user_id IS NULL)
  );

\echo 'Validações pós-migração...'

SELECT COUNT(*) AS registros_sem_tipo_admin_pos
FROM audit_logs
WHERE user_id IS NOT NULL
  AND (user_type IS NULL OR TRIM(user_type) = '');

SELECT COUNT(*) AS registros_publicos_sem_uuid_pos
FROM audit_logs
WHERE user_id IS NULL
  AND user_type IN ('cliente', 'proprietario')
  AND public_user_uuid IS NULL;

\echo 'Script concluído. Atualize inventários e anexe evidências.'

-- ###########################################################################
-- Rollback (manual):
-- 1. ALTER TABLE audit_logs DROP CONSTRAINT chk_audit_logs_user_identity;
-- 2. ALTER TABLE audit_logs ADD COLUMN user_id_int INTEGER;
-- 3. (Opcional) Repopular user_id_int a partir de backups se necessário.
-- ###########################################################################



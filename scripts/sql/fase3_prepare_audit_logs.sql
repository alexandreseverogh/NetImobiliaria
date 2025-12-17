\echo 'Preparando audit_logs para suportar UUID público'

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS public_user_uuid uuid;

COMMENT ON COLUMN audit_logs.public_user_uuid IS 'UUID de clientes/proprietários para eventos públicos (mantido até remoção de user_id_int)';

\echo 'Migrando dados existentes (clientes)'
UPDATE audit_logs al
SET public_user_uuid = c.uuid
FROM clientes c
WHERE al.resource IN ('PUBLIC_AUTH', 'PUBLIC_REGISTER')
  AND al.user_type = 'cliente'
  AND al.public_user_uuid IS NULL
  AND (al.user_id IS NULL OR al.user_id = c.uuid)
  AND al.user_id_int = c.id;

\echo 'Migrando dados existentes (proprietários)'
UPDATE audit_logs al
SET public_user_uuid = p.uuid
FROM proprietarios p
WHERE al.resource IN ('PUBLIC_AUTH', 'PUBLIC_REGISTER')
  AND al.user_type = 'proprietario'
  AND al.public_user_uuid IS NULL
  AND (al.user_id IS NULL OR al.user_id = p.uuid)
  AND al.user_id_int = p.id;

\echo 'Pendências após migração'
SELECT COUNT(*) AS audit_logs_public_missing_uuid
FROM audit_logs
WHERE resource IN ('PUBLIC_AUTH', 'PUBLIC_REGISTER')
  AND public_user_uuid IS NULL;


\echo 'Reforçando user_id em audit_logs para registros públicos...'

-- Atualizar logs de clientes usando a coluna uuid da tabela clientes
UPDATE audit_logs al
SET user_id = c.uuid
FROM clientes c
WHERE al.resource IN ('PUBLIC_AUTH', 'PUBLIC_REGISTER')
  AND al.user_type = 'cliente'
  AND al.user_id IS NULL
  AND al.user_id_int = c.id;

-- Atualizar logs de proprietários
UPDATE audit_logs al
SET user_id = p.uuid
FROM proprietarios p
WHERE al.resource IN ('PUBLIC_AUTH', 'PUBLIC_REGISTER')
  AND al.user_type = 'proprietario'
  AND al.user_id IS NULL
  AND al.user_id_int = p.id;

\echo 'Validando pendências ainda sem UUID...'
SELECT COUNT(*) AS audit_logs_public_missing_uuid
FROM audit_logs
WHERE resource IN ('PUBLIC_AUTH', 'PUBLIC_REGISTER')
  AND user_id IS NULL;


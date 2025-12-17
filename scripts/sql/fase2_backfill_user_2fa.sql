-- Fase 2 – Backfill de UUID para tabelas 2FA e audit_logs
-- Objetivo: Preencher colunas user_id (uuid) nos registros públicos mantendo dual key.
-- Executar somente após revisão e aprovação conforme Guardian Rules.

\echo 'Iniciando backfill de user_2fa_codes (clientes)...'
UPDATE user_2fa_codes ufc
SET user_id = c.uuid
FROM clientes c
WHERE ufc.user_type = 'cliente'
  AND ufc.user_id IS NULL
  AND ufc.user_id_int = c.id;

\echo 'Iniciando backfill de user_2fa_codes (proprietarios)...'
UPDATE user_2fa_codes ufc
SET user_id = p.uuid
FROM proprietarios p
WHERE ufc.user_type = 'proprietario'
  AND ufc.user_id IS NULL
  AND ufc.user_id_int = p.id;

\echo 'Backfill em audit_logs (2FA públicos)...'
UPDATE audit_logs al
SET user_id = c.uuid
FROM clientes c
WHERE al.user_type = 'cliente'
  AND al.user_id IS NULL
  AND al.user_id_int = c.id;

UPDATE audit_logs al
SET user_id = p.uuid
FROM proprietarios p
WHERE al.user_type = 'proprietario'
  AND al.user_id IS NULL
  AND al.user_id_int = p.id;

\echo 'Backfill concluído. Recomenda-se validar contagens e registrar evidências no plano.'


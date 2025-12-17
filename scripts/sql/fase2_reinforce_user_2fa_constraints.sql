-- Fase 2 – Reforço de constraints e índices preparados para remoção de user_id_int
-- Executar somente após concluir o backfill (user_id preenchido) e testes de UI.
-- Este script NÃO remove colunas legadas; apenas prepara consistência para a fase estrutural.

\echo 'Verificando pendências antes de reforçar constraints...'
SELECT COUNT(*) AS user_2fa_codes_missing_uuid FROM user_2fa_codes WHERE user_id IS NULL;
SELECT COUNT(*) AS audit_logs_uuid_null FROM audit_logs WHERE resource = '2FA' AND user_id IS NULL;

\echo 'Criando índice auxiliar em user_2fa_codes (user_id)...'
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_user_id ON user_2fa_codes(user_id);

\echo 'Criando índice auxiliar em user_2fa_config (user_id)...'
CREATE INDEX IF NOT EXISTS idx_user_2fa_config_user_id ON user_2fa_config(user_id);

\echo 'Criando índice auxiliar em audit_logs (user_id, resource)...'
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_resource ON audit_logs(user_id, resource);

\echo 'Adicionando constraint de validação (modo sinalização)...'
-- Constraint de verificação (não deferrable) - impede novos registros sem UUID quando user_id_int não for informado
ALTER TABLE user_2fa_codes
  ADD CONSTRAINT chk_user_2fa_codes_uuid_present
  CHECK (
    (user_type = 'admin' AND user_id IS NOT NULL AND user_id_int IS NULL)
    OR (user_type IN ('cliente','proprietario') AND (user_id IS NOT NULL OR user_id_int IS NOT NULL))
  ) NOT VALID;

ALTER TABLE user_2fa_config
  ADD CONSTRAINT chk_user_2fa_config_uuid_present
  CHECK (
    (user_type = 'admin' AND user_id IS NOT NULL AND user_id_int IS NULL)
    OR (user_type IN ('cliente','proprietario') AND (user_id IS NOT NULL OR user_id_int IS NOT NULL))
  ) NOT VALID;

\echo 'Validação manual pendente: executar testes de UI e validar constraints com NOT VALID -> VALID após aprovação.'

-- Para validar após testes:
-- ALTER TABLE user_2fa_codes VALIDATE CONSTRAINT chk_user_2fa_codes_uuid_present;
-- ALTER TABLE user_2fa_config VALIDATE CONSTRAINT chk_user_2fa_config_uuid_present;


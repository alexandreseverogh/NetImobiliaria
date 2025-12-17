-- Fase 3 - Atualização dos valores permitidos em login_logs.action
-- Objetivo: permitir registro de cadastros públicos bem-sucedidos ou falhos

\echo '✅ Iniciando atualização de login_logs.action (permitir register/register_failed)'

BEGIN;

-- Verificação prévia: garantir que constraint atual existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.check_constraints
    WHERE constraint_name = 'login_logs_action_check'
      AND constraint_schema = 'public'
  ) THEN
    RAISE EXCEPTION 'Constraint login_logs_action_check não encontrada';
  END IF;
END$$;

-- Ajuste: remover constraint atual
ALTER TABLE login_logs
  DROP CONSTRAINT IF EXISTS login_logs_action_check;

-- Recriar constraint permitindo novos valores
ALTER TABLE login_logs
  ADD CONSTRAINT login_logs_action_check
  CHECK (
    action::text = ANY (
      ARRAY[
        'login'::varchar,
        'logout'::varchar,
        'login_failed'::varchar,
        '2fa_required'::varchar,
        '2fa_success'::varchar,
        '2fa_failed'::varchar,
        'register'::varchar,
        'register_failed'::varchar
      ]::text[]
    )
  );

COMMIT;

\echo '✅ Atualização concluída com sucesso'


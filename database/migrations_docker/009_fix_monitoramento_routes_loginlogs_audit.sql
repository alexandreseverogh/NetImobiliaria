-- 009_fix_monitoramento_routes_loginlogs_audit.sql
-- Garante que as rotas de monitoramento/auditoria (login-logs e audit) usem o feature correto
-- e a ação correta (EXECUTE), para evitar 403 quando o frontend já possui permissão.
-- Idempotente.

DO $$
DECLARE
  feature_monitoramento_id INTEGER;
BEGIN
  SELECT id
    INTO feature_monitoramento_id
  FROM public.system_features
  WHERE slug = 'monitoramento-auditoria-login-logout-2fa'
  LIMIT 1;

  IF feature_monitoramento_id IS NULL THEN
    RAISE WARNING 'Feature slug "monitoramento-auditoria-login-logout-2fa" não encontrado. Migração 009 não aplicou mudanças.';
    RETURN;
  END IF;

  -- Atualizar (ou criar) rota: GET /api/admin/login-logs
  IF EXISTS (
    SELECT 1 FROM public.route_permissions_config
    WHERE route_pattern = '/api/admin/login-logs' AND method = 'GET'
  ) THEN
    UPDATE public.route_permissions_config
       SET feature_id = feature_monitoramento_id,
           default_action = 'EXECUTE',
           is_active = true
     WHERE route_pattern = '/api/admin/login-logs' AND method = 'GET';
  ELSE
    INSERT INTO public.route_permissions_config
      (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa, is_active)
    VALUES
      ('/api/admin/login-logs', 'GET', feature_monitoramento_id, 'EXECUTE', true, false, true);
  END IF;

  -- Atualizar (ou criar) rota: GET /api/admin/audit
  IF EXISTS (
    SELECT 1 FROM public.route_permissions_config
    WHERE route_pattern = '/api/admin/audit' AND method = 'GET'
  ) THEN
    UPDATE public.route_permissions_config
       SET feature_id = feature_monitoramento_id,
           default_action = 'EXECUTE',
           is_active = true
     WHERE route_pattern = '/api/admin/audit' AND method = 'GET';
  ELSE
    INSERT INTO public.route_permissions_config
      (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa, is_active)
    VALUES
      ('/api/admin/audit', 'GET', feature_monitoramento_id, 'EXECUTE', true, false, true);
  END IF;

  -- Opcional: também alinhar rotas auxiliares de login-logs
  IF EXISTS (
    SELECT 1 FROM public.route_permissions_config
    WHERE route_pattern = '/api/admin/login-logs/archived' AND method = 'GET'
  ) THEN
    UPDATE public.route_permissions_config
       SET feature_id = feature_monitoramento_id,
           default_action = 'EXECUTE',
           is_active = true
     WHERE route_pattern = '/api/admin/login-logs/archived' AND method = 'GET';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.route_permissions_config
    WHERE route_pattern = '/api/admin/login-logs/purge' AND method = 'POST'
  ) THEN
    UPDATE public.route_permissions_config
       SET feature_id = feature_monitoramento_id,
           default_action = 'EXECUTE',
           is_active = true
     WHERE route_pattern = '/api/admin/login-logs/purge' AND method = 'POST';
  END IF;

  RAISE NOTICE 'Migração 009 aplicada: rotas login-logs/audit ajustadas para feature monitoramento-auditoria-login-logout-2fa com ação EXECUTE.';
END $$;



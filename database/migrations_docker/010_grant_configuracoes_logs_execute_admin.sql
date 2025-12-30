-- 010_grant_configuracoes_logs_execute_admin.sql
-- Concede permissão EXECUTE para o feature "configuracoes-logs" para Super Admin e Administrador.
-- Idempotente.

DO $$
DECLARE
  feature_id INTEGER;
  execute_permission_id INTEGER;
  super_admin_role_id INTEGER;
  administrador_role_id INTEGER;
  granted_by_user_id UUID;
BEGIN
  -- Feature
  SELECT id INTO feature_id
  FROM public.system_features
  WHERE slug = 'configuracoes-logs'
  LIMIT 1;

  IF feature_id IS NULL THEN
    RAISE WARNING 'Feature "configuracoes-logs" não encontrada. Migração 010 não aplicou mudanças.';
    RETURN;
  END IF;

  -- Permission (execute)
  SELECT id INTO execute_permission_id
  FROM public.permissions
  WHERE feature_id = feature_id AND action = 'execute'
  LIMIT 1;

  IF execute_permission_id IS NULL THEN
    INSERT INTO public.permissions (feature_id, action, description, created_at)
    VALUES (feature_id, 'execute', 'Executar Configurações de Logs', NOW())
    RETURNING id INTO execute_permission_id;
  END IF;

  -- Roles
  SELECT id INTO super_admin_role_id FROM public.user_roles WHERE name = 'Super Admin' LIMIT 1;
  SELECT id INTO administrador_role_id FROM public.user_roles WHERE name = 'Administrador' LIMIT 1;

  -- granted_by (tenta admin, senão NULL)
  SELECT id INTO granted_by_user_id FROM public.users WHERE username = 'admin' LIMIT 1;

  IF super_admin_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id, granted_by, granted_at)
    VALUES (super_admin_role_id, execute_permission_id, granted_by_user_id, NOW())
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  IF administrador_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id, granted_by, granted_at)
    VALUES (administrador_role_id, execute_permission_id, granted_by_user_id, NOW())
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  RAISE NOTICE 'Migração 010 aplicada: EXECUTE em configuracoes-logs concedido a Super Admin/Administrador.';
END $$;



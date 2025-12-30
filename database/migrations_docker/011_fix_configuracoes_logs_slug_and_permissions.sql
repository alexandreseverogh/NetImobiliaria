-- 011_fix_configuracoes_logs_slug_and_permissions.sql
-- No banco do container, o slug ainda pode estar como "configuracoes-de-logs".
-- Esta migração padroniza para "configuracoes-logs" e garante permissão EXECUTE
-- para Super Admin e Administrador.
-- Idempotente.

DO $$
DECLARE
  v_feature_id INTEGER;
  v_execute_permission_id INTEGER;
  super_admin_role_id INTEGER;
  administrador_role_id INTEGER;
  granted_by_user_id UUID;
BEGIN
  -- 1) Encontrar feature (slug antigo ou novo)
  SELECT id INTO v_feature_id
  FROM public.system_features
  WHERE slug IN ('configuracoes-logs', 'configuracoes-de-logs', 'configuraces-de-logs')
     OR name ILIKE '%Configura%Logs%'
  ORDER BY
    CASE
      WHEN slug = 'configuracoes-logs' THEN 0
      WHEN slug = 'configuracoes-de-logs' THEN 1
      WHEN slug = 'configuraces-de-logs' THEN 2
      ELSE 3
    END
  LIMIT 1;

  IF v_feature_id IS NULL THEN
    RAISE WARNING 'Feature de Configurações de Logs não encontrada. Migração 011 não aplicou mudanças.';
    RETURN;
  END IF;

  -- 2) Padronizar slug
  UPDATE public.system_features
     SET slug = 'configuracoes-logs'
   WHERE id = v_feature_id
     AND slug <> 'configuracoes-logs';

  -- 3) Garantir permissão EXECUTE
  SELECT p.id INTO v_execute_permission_id
  FROM public.permissions p
  WHERE p.feature_id = v_feature_id AND p.action = 'execute'
  LIMIT 1;

  IF v_execute_permission_id IS NULL THEN
    INSERT INTO public.permissions (feature_id, action, description, created_at)
    VALUES (v_feature_id, 'execute', 'Executar Configurações de Logs', NOW())
    RETURNING id INTO v_execute_permission_id;
  END IF;

  -- 4) Roles
  SELECT id INTO super_admin_role_id FROM public.user_roles WHERE name = 'Super Admin' LIMIT 1;
  SELECT id INTO administrador_role_id FROM public.user_roles WHERE name = 'Administrador' LIMIT 1;

  -- 5) granted_by (tenta admin, senão NULL)
  SELECT id INTO granted_by_user_id FROM public.users WHERE username = 'admin' LIMIT 1;

  IF super_admin_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id, granted_by, granted_at)
    VALUES (super_admin_role_id, v_execute_permission_id, granted_by_user_id, NOW())
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  IF administrador_role_id IS NOT NULL THEN
    INSERT INTO public.role_permissions (role_id, permission_id, granted_by, granted_at)
    VALUES (administrador_role_id, v_execute_permission_id, granted_by_user_id, NOW())
    ON CONFLICT (role_id, permission_id) DO NOTHING;
  END IF;

  RAISE NOTICE 'Migração 011 aplicada: slug configuracoes-logs padronizado e EXECUTE concedido a Super Admin/Administrador.';
END $$;



-- 007_corretor_read_status_imoveis.sql
-- Permite que o perfil "Corretor" consiga carregar a lista de Status de Imóveis
-- (necessário para o fluxo de Novo Imóvel iniciado pelo portal do corretor).
-- Idempotente.

DO $$
DECLARE
  v_role_id integer;
  v_permission_id integer;
BEGIN
  -- Role "Corretor"
  SELECT id INTO v_role_id
  FROM public.user_roles
  WHERE name = 'Corretor'
  LIMIT 1;

  IF v_role_id IS NULL THEN
    RAISE NOTICE 'Role Corretor não encontrado, pulando.';
    RETURN;
  END IF;

  -- Permission READ do feature "Status de Imóveis" (feature_id = 14)
  SELECT id INTO v_permission_id
  FROM public.permissions
  WHERE feature_id = 14 AND action = 'read'
  LIMIT 1;

  -- Caso a permissão não exista, criar (mantém idempotência)
  IF v_permission_id IS NULL THEN
    INSERT INTO public.permissions(feature_id, action, description, requires_2fa)
    VALUES (14, 'read', 'Permissão de leitura para Status de Imóveis', false)
    ON CONFLICT (feature_id, action) DO NOTHING;

    SELECT id INTO v_permission_id
    FROM public.permissions
    WHERE feature_id = 14 AND action = 'read'
    LIMIT 1;
  END IF;

  IF v_permission_id IS NULL THEN
    RAISE NOTICE 'Permissão read do feature 14 não encontrada, pulando.';
    RETURN;
  END IF;

  INSERT INTO public.role_permissions(role_id, permission_id)
  VALUES (v_role_id, v_permission_id)
  ON CONFLICT (role_id, permission_id) DO NOTHING;
END $$;



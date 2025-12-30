-- 008_corretor_read_amenidades_proximidades.sql
-- Permite que o perfil "Corretor" carregue dados necessários do Step 3 (Amenidades)
-- e Step 4 (Proximidades) do Novo Imóvel no fluxo via modal do corretor.
-- Endpoints protegidos por READ:
-- - /api/admin/categorias-amenidades   (feature_id=7)
-- - /api/admin/amenidades             (feature_id=8)
-- - /api/admin/categorias-proximidades(feature_id=9)
-- - /api/admin/proximidades           (feature_id=10)
-- Idempotente.

DO $$
DECLARE
  v_role_id integer;
  v_feature_id integer;
  v_permission_id integer;
  v_feature_ids integer[] := ARRAY[7,8,9,10];
BEGIN
  SELECT id INTO v_role_id
  FROM public.user_roles
  WHERE name = 'Corretor'
  LIMIT 1;

  IF v_role_id IS NULL THEN
    RAISE NOTICE 'Role Corretor não encontrado, pulando.';
    RETURN;
  END IF;

  FOREACH v_feature_id IN ARRAY v_feature_ids LOOP
    v_permission_id := NULL;

    SELECT id INTO v_permission_id
    FROM public.permissions
    WHERE feature_id = v_feature_id AND action = 'read'
    LIMIT 1;

    IF v_permission_id IS NULL THEN
      INSERT INTO public.permissions(feature_id, action, description, requires_2fa)
      VALUES (v_feature_id, 'read', 'Permissão de leitura (Corretor) para feature ' || v_feature_id, false)
      ON CONFLICT (feature_id, action) DO NOTHING;

      SELECT id INTO v_permission_id
      FROM public.permissions
      WHERE feature_id = v_feature_id AND action = 'read'
      LIMIT 1;
    END IF;

    IF v_permission_id IS NOT NULL THEN
      INSERT INTO public.role_permissions(role_id, permission_id)
      VALUES (v_role_id, v_permission_id)
      ON CONFLICT (role_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;



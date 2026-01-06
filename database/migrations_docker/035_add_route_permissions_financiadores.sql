-- 035_add_route_permissions_financiadores.sql
-- Protege o CRUD de /admin/financiadores via sistema unificado (route_permissions_config).
-- A feature system_features.slug='financiadores' já existe no banco.

DO $$
DECLARE
  v_feature_id INTEGER;
BEGIN
  SELECT id INTO v_feature_id
  FROM system_features
  WHERE slug = 'financiadores'
  LIMIT 1;

  IF v_feature_id IS NULL THEN
    RAISE EXCEPTION 'Feature slug=financiadores não encontrada em system_features';
  END IF;

  -- API: listar (READ) / criar (CREATE)
  INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa, is_active)
  VALUES ('/api/admin/financiadores', 'GET', v_feature_id, 'READ', true, false, true)
  ON CONFLICT (route_pattern, method) DO UPDATE
    SET feature_id = EXCLUDED.feature_id,
        default_action = EXCLUDED.default_action,
        requires_auth = EXCLUDED.requires_auth,
        requires_2fa = EXCLUDED.requires_2fa,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

  INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa, is_active)
  VALUES ('/api/admin/financiadores', 'POST', v_feature_id, 'CREATE', true, false, true)
  ON CONFLICT (route_pattern, method) DO UPDATE
    SET feature_id = EXCLUDED.feature_id,
        default_action = EXCLUDED.default_action,
        requires_auth = EXCLUDED.requires_auth,
        requires_2fa = EXCLUDED.requires_2fa,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

  -- API: buscar (READ) / atualizar (UPDATE) / excluir (DELETE)
  INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa, is_active)
  VALUES ('/api/admin/financiadores/[id]', 'GET', v_feature_id, 'READ', true, false, true)
  ON CONFLICT (route_pattern, method) DO UPDATE
    SET feature_id = EXCLUDED.feature_id,
        default_action = EXCLUDED.default_action,
        requires_auth = EXCLUDED.requires_auth,
        requires_2fa = EXCLUDED.requires_2fa,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

  INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa, is_active)
  VALUES ('/api/admin/financiadores/[id]', 'PUT', v_feature_id, 'UPDATE', true, false, true)
  ON CONFLICT (route_pattern, method) DO UPDATE
    SET feature_id = EXCLUDED.feature_id,
        default_action = EXCLUDED.default_action,
        requires_auth = EXCLUDED.requires_auth,
        requires_2fa = EXCLUDED.requires_2fa,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;

  INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa, is_active)
  VALUES ('/api/admin/financiadores/[id]', 'DELETE', v_feature_id, 'DELETE', true, false, true)
  ON CONFLICT (route_pattern, method) DO UPDATE
    SET feature_id = EXCLUDED.feature_id,
        default_action = EXCLUDED.default_action,
        requires_auth = EXCLUDED.requires_auth,
        requires_2fa = EXCLUDED.requires_2fa,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP;
END $$;



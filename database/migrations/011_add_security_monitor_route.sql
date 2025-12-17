-- ============================================================
-- MIGRATION 011: Adicionar rota de Security Monitor
-- ============================================================
-- Objetivo: Configurar a rota /api/admin/security-monitor
--           para usar o sistema unificado de permissões
-- ============================================================

BEGIN;

-- Verificar se a funcionalidade existe em system_features
DO $$
DECLARE
  v_feature_id INTEGER;
  v_route_exists BOOLEAN;
BEGIN
  -- Buscar ou criar a funcionalidade de auditoria/security monitor
  SELECT id INTO v_feature_id 
  FROM system_features 
  WHERE slug = 'auditoria' OR name ILIKE '%audit%'
  LIMIT 1;
  
  -- Se não existir, usar uma funcionalidade genérica de admin
  IF v_feature_id IS NULL THEN
    SELECT id INTO v_feature_id 
    FROM system_features 
    WHERE slug = 'dashboard'
    LIMIT 1;
  END IF;
  
  -- Se ainda não existe, criar a funcionalidade
  IF v_feature_id IS NULL THEN
    INSERT INTO system_features (name, description, url, category, is_active, Crud_Execute, slug)
    VALUES (
      'Monitoramento de Segurança',
      'Dashboard de eventos de segurança e auditoria',
      '/admin/security-monitor',
      'Segurança',
      true,
      'EXECUTE',
      'monitoramento-seguranca'
    )
    RETURNING id INTO v_feature_id;
    
    RAISE NOTICE 'Funcionalidade "Monitoramento de Seguranca" criada com ID: %', v_feature_id;
    
    -- Criar permissão EXECUTE para a nova funcionalidade
    INSERT INTO permissions (feature_id, action, description)
    VALUES (
      v_feature_id,
      'execute',
      'Visualizar eventos de segurança'
    );
    
    -- Atribuir permissão ao Super Admin
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT 
      ur.id,
      p.id
    FROM user_roles ur
    CROSS JOIN permissions p
    WHERE ur.name = 'Super Admin'
      AND p.feature_id = v_feature_id
    ON CONFLICT (role_id, permission_id) DO NOTHING;
    
    RAISE NOTICE 'Permissao EXECUTE criada e atribuida ao Super Admin';
  END IF;
  
  -- Verificar se a rota já existe
  SELECT EXISTS (
    SELECT 1 FROM route_permissions_config 
    WHERE route_pattern = '/api/admin/security-monitor'
  ) INTO v_route_exists;
  
  -- Inserir configuração da rota se não existir
  IF NOT v_route_exists THEN
    INSERT INTO route_permissions_config (
      route_pattern,
      method,
      feature_id,
      default_action,
      requires_auth,
      requires_2fa,
      is_active,
      created_by
    ) VALUES (
      '/api/admin/security-monitor',
      'GET',
      v_feature_id,
      'EXECUTE',
      true,
      false,
      true,
      NULL
    );
    
    RAISE NOTICE 'Rota /api/admin/security-monitor configurada';
  ELSE
    RAISE NOTICE 'Rota /api/admin/security-monitor ja existe';
  END IF;
  
END $$;

COMMIT;

-- Verificar resultado
SELECT 
  rpc.route_pattern,
  rpc.method,
  sf.name as feature_name,
  sf.slug as feature_slug,
  rpc.default_action,
  rpc.requires_auth,
  rpc.is_active
FROM route_permissions_config rpc
JOIN system_features sf ON rpc.feature_id = sf.id
WHERE rpc.route_pattern = '/api/admin/security-monitor';


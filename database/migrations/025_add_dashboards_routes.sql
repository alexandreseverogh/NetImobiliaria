-- ================================================================
-- MIGRATION 025: ADICIONAR ROTAS DE DASHBOARDS
-- ================================================================
-- Configura todas as rotas necessárias para a página de dashboards
-- ================================================================

BEGIN;

-- 1. Criar system_feature para Dashboards (se não existir)
INSERT INTO system_features (name, description, url, "Crud_Execute", is_active)
SELECT 
    'Dashboards',
    'Painéis analíticos do sistema e imóveis',
    '/admin/dashboards',
    'EXECUTE',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM system_features WHERE slug = 'dashboards'
);

-- 2. Criar permission para Dashboards
INSERT INTO permissions (feature_id, action, description)
SELECT 
    sf.id,
    'execute',
    'Executar visualização de dashboards'
FROM system_features sf
WHERE sf.slug = 'dashboards'
AND NOT EXISTS (
    SELECT 1 FROM permissions p
    WHERE p.feature_id = sf.id AND p.action = 'execute'
);

-- 3. Configurar rotas no route_permissions_config
-- Página principal
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa, is_active)
SELECT 
    '/admin/dashboards',
    'GET',
    sf.id,
    'EXECUTE',
    true,
    false,
    true
FROM system_features sf
WHERE sf.slug = 'dashboards'
AND NOT EXISTS (
    SELECT 1 FROM route_permissions_config WHERE route_pattern = '/admin/dashboards'
);

-- APIs de Dashboards - Sistema
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa, is_active)
SELECT 
    '/api/admin/dashboards/audit-actions',
    'GET',
    sf.id,
    'EXECUTE',
    true,
    false,
    true
FROM system_features sf
WHERE sf.slug = 'dashboards'
AND NOT EXISTS (
    SELECT 1 FROM route_permissions_config WHERE route_pattern = '/api/admin/dashboards/audit-actions'
);

INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa, is_active)
SELECT 
    '/api/admin/dashboards/login-profiles',
    'GET',
    sf.id,
    'EXECUTE',
    true,
    false,
    true
FROM system_features sf
WHERE sf.slug = 'dashboards'
AND NOT EXISTS (
    SELECT 1 FROM route_permissions_config WHERE route_pattern = '/api/admin/dashboards/login-profiles'
);

-- APIs de Dashboards - Imóveis
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa, is_active)
SELECT 
    route,
    'GET',
    sf.id,
    'EXECUTE',
    true,
    false,
    true
FROM system_features sf, (VALUES
    ('/api/admin/dashboards/imoveis-por-tipo'),
    ('/api/admin/dashboards/imoveis-por-finalidade'),
    ('/api/admin/dashboards/imoveis-por-status'),
    ('/api/admin/dashboards/imoveis-por-estado'),
    ('/api/admin/dashboards/imoveis-por-faixa-preco'),
    ('/api/admin/dashboards/imoveis-por-quartos'),
    ('/api/admin/dashboards/imoveis-por-area')
) AS routes(route)
WHERE sf.slug = 'dashboards'
AND NOT EXISTS (
    SELECT 1 FROM route_permissions_config WHERE route_pattern = routes.route
);

COMMIT;

-- ================================================================
-- VERIFICAÇÃO
-- ================================================================
SELECT 
    'Feature criada' as verificacao,
    name,
    slug
FROM system_features
WHERE slug = 'dashboards';

SELECT 
    'Rotas configuradas' as verificacao,
    COUNT(*)::integer as total
FROM route_permissions_config
WHERE route_pattern LIKE '%dashboards%';


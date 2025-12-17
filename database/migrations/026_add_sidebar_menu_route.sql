-- ================================================================
-- MIGRATION 026: ADICIONAR ROTA /api/admin/sidebar/menu
-- ================================================================
-- A API precisa estar configurada para o middleware funcionar
-- ================================================================

BEGIN;

-- Adicionar rota para sidebar/menu
-- Esta rota é especial: qualquer usuário logado pode acessar
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa, is_active)
SELECT 
    '/api/admin/sidebar/menu',
    'GET',
    sf.id,
    'READ',
    true,
    false,
    true
FROM system_features sf
WHERE sf.slug = 'configuracao-sidebar'
AND NOT EXISTS (
    SELECT 1 FROM route_permissions_config WHERE route_pattern = '/api/admin/sidebar/menu'
);

COMMIT;

-- Verificação
SELECT 
    'Rota sidebar/menu configurada' as resultado,
    COUNT(*)::integer as total
FROM route_permissions_config
WHERE route_pattern = '/api/admin/sidebar/menu';




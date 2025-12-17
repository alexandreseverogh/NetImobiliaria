-- ============================================================
-- MIGRATION 018: Adicionar rotas de login-logs
-- ============================================================

BEGIN;

-- Inserir rota principal de login-logs
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
    '/api/admin/login-logs',
    'GET',
    (SELECT id FROM system_features WHERE slug = 'monitoramento-e-auditoria-de-tentativas-de-login-logout-com-status-2fa'),
    'READ',
    true,
    false,
    true,
    (SELECT id FROM users WHERE username = 'admin')
)
ON CONFLICT DO NOTHING;

-- Inserir rota da página frontend
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
    '/admin/login-logs',
    'GET',
    (SELECT id FROM system_features WHERE slug = 'monitoramento-e-auditoria-de-tentativas-de-login-logout-com-status-2fa'),
    'READ',
    true,
    false,
    true,
    (SELECT id FROM users WHERE username = 'admin')
)
ON CONFLICT DO NOTHING;

-- Verificar inserção
SELECT 
    rpc.route_pattern,
    rpc.method,
    rpc.default_action,
    sf.slug,
    sf.name
FROM route_permissions_config rpc
JOIN system_features sf ON rpc.feature_id = sf.id
WHERE rpc.route_pattern LIKE '%login-logs%'
ORDER BY rpc.route_pattern;

COMMIT;




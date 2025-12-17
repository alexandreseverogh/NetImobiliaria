-- ============================================================
-- MIGRATION 004: Popular route_permissions_config
-- Data: 2025-10-29
-- Objetivo: Mapear rotas baseado em system_features.url
-- ============================================================

-- ============================================================
-- ESTRATÉGIA:
-- Usar system_features.url como BASE e gerar variações
-- automáticas seguindo convenção REST/CRUD padrão
-- ============================================================

-- 1. GERAR ROTAS DE PÁGINAS (Frontend)
-- Padrão: /admin/[recurso], /admin/[recurso]/novo, /admin/[recurso]/[id]/editar

INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth)
SELECT 
    sf.url,                    -- Rota base: /admin/amenidades
    'GET',
    sf.id,
    'READ',
    true
FROM system_features sf
WHERE sf.url IS NOT NULL 
  AND sf.url LIKE '/admin/%'
  AND sf.is_active = true
ON CONFLICT (route_pattern, method) DO NOTHING;

-- Rota /novo (criar)
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth)
SELECT 
    sf.url || '/novo',        -- /admin/amenidades/novo
    'GET',
    sf.id,
    'WRITE',
    true
FROM system_features sf
WHERE sf.url IS NOT NULL 
  AND sf.url LIKE '/admin/%'
  AND sf.url NOT LIKE '%/%/%'  -- Não duplicar subrotas
  AND sf.is_active = true
ON CONFLICT (route_pattern, method) DO NOTHING;

-- Rota /[id]/editar (editar)
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth)
SELECT 
    sf.url || '/[id]/editar', -- /admin/amenidades/[id]/editar
    'GET',
    sf.id,
    'WRITE',
    true
FROM system_features sf
WHERE sf.url IS NOT NULL 
  AND sf.url LIKE '/admin/%'
  AND sf.url NOT LIKE '%/%/%'
  AND sf.is_active = true
ON CONFLICT (route_pattern, method) DO NOTHING;

-- Rota /[id] (visualizar)
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth)
SELECT 
    sf.url || '/[id]',        -- /admin/amenidades/[id]
    'GET',
    sf.id,
    'READ',
    true
FROM system_features sf
WHERE sf.url IS NOT NULL 
  AND sf.url LIKE '/admin/%'
  AND sf.url NOT LIKE '%/%/%'
  AND sf.is_active = true
ON CONFLICT (route_pattern, method) DO NOTHING;

-- ============================================================
-- 2. GERAR ROTAS DE API (Backend)
-- Padrão REST: GET, POST, PUT, DELETE em /api/admin/[recurso]
-- ============================================================

-- Extrair nome do recurso da URL (/admin/amenidades → amenidades)
-- E gerar rotas de API correspondentes

-- API - GET (listar)
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth)
SELECT 
    '/api' || sf.url,         -- /api/admin/amenidades
    'GET',
    sf.id,
    'READ',
    true
FROM system_features sf
WHERE sf.url IS NOT NULL 
  AND sf.url LIKE '/admin/%'
  AND sf.url NOT LIKE '%/%/%'
  AND sf.is_active = true
ON CONFLICT (route_pattern, method) DO NOTHING;

-- API - POST (criar)
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth)
SELECT 
    '/api' || sf.url,         -- /api/admin/amenidades
    'POST',
    sf.id,
    'WRITE',
    true
FROM system_features sf
WHERE sf.url IS NOT NULL 
  AND sf.url LIKE '/admin/%'
  AND sf.url NOT LIKE '%/%/%'
  AND sf.is_active = true
ON CONFLICT (route_pattern, method) DO NOTHING;

-- API - GET /[id] (buscar um)
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth)
SELECT 
    '/api' || sf.url || '/[id]', -- /api/admin/amenidades/[id]
    'GET',
    sf.id,
    'READ',
    true
FROM system_features sf
WHERE sf.url IS NOT NULL 
  AND sf.url LIKE '/admin/%'
  AND sf.url NOT LIKE '%/%/%'
  AND sf.is_active = true
ON CONFLICT (route_pattern, method) DO NOTHING;

-- API - PUT /[id] (atualizar)
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth)
SELECT 
    '/api' || sf.url || '/[id]', -- /api/admin/amenidades/[id]
    'PUT',
    sf.id,
    'WRITE',
    true
FROM system_features sf
WHERE sf.url IS NOT NULL 
  AND sf.url LIKE '/admin/%'
  AND sf.url NOT LIKE '%/%/%'
  AND sf.is_active = true
ON CONFLICT (route_pattern, method) DO NOTHING;

-- API - DELETE /[id] (excluir)
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth)
SELECT 
    '/api' || sf.url || '/[id]', -- /api/admin/amenidades/[id]
    'DELETE',
    sf.id,
    'DELETE',
    true
FROM system_features sf
WHERE sf.url IS NOT NULL 
  AND sf.url LIKE '/admin/%'
  AND sf.url NOT LIKE '%/%/%'
  AND sf.is_active = true
ON CONFLICT (route_pattern, method) DO NOTHING;

-- ============================================================
-- 3. ROTAS ESPECIAIS (que fogem do padrão)
-- ============================================================

-- Rotas de autenticação (públicas)
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth)
VALUES 
('/api/admin/auth/login', 'POST', NULL, 'READ', false),
('/api/admin/auth/logout', 'POST', NULL, 'READ', false),
('/api/admin/auth/refresh', 'POST', NULL, 'READ', false)
ON CONFLICT (route_pattern, method) DO NOTHING;

-- Rotas que exigem 2FA
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action, requires_auth, requires_2fa)
SELECT 
    '/api/admin/roles/[id]/permissions',
    'PUT',
    sf.id,
    'ADMIN',
    true,
    true
FROM system_features sf
WHERE sf.slug = 'gest-o-de-perfis'
ON CONFLICT (route_pattern, method) DO UPDATE 
SET requires_2fa = true;

-- ============================================================
-- 4. VERIFICAÇÃO FINAL
-- ============================================================

SELECT 
    'route_permissions_config populada' as status,
    COUNT(*) as total_rotas,
    COUNT(DISTINCT feature_id) as features_mapeadas,
    COUNT(*) FILTER (WHERE requires_2fa = true) as rotas_com_2fa
FROM route_permissions_config;

-- Mostrar rotas por funcionalidade
SELECT 
    sf.name as funcionalidade,
    sf.slug,
    COUNT(*) as qtd_rotas,
    STRING_AGG(DISTINCT rpc.method, ', ' ORDER BY rpc.method) as metodos
FROM route_permissions_config rpc
JOIN system_features sf ON rpc.feature_id = sf.id
GROUP BY sf.id, sf.name, sf.slug
ORDER BY sf.name
LIMIT 15;

-- ============================================================
-- MIGRATION 004 CONCLUÍDA
-- ============================================================




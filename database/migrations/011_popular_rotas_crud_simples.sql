-- Popular rotas de CRUD simples
INSERT INTO route_permissions_config (route_pattern, method, feature_id, default_action) VALUES
-- Amenidades
('/admin/amenidades', 'GET', (SELECT id FROM system_features WHERE slug = 'amenidades'), 'READ'),
('/admin/amenidades/novo', 'GET', (SELECT id FROM system_features WHERE slug = 'amenidades'), 'WRITE'),
('/admin/amenidades/[id]/editar', 'GET', (SELECT id FROM system_features WHERE slug = 'amenidades'), 'WRITE'),
('/api/admin/amenidades', 'GET', (SELECT id FROM system_features WHERE slug = 'amenidades'), 'READ'),
('/api/admin/amenidades', 'POST', (SELECT id FROM system_features WHERE slug = 'amenidades'), 'WRITE'),
('/api/admin/amenidades/[slug]', 'GET', (SELECT id FROM system_features WHERE slug = 'amenidades'), 'READ'),
('/api/admin/amenidades/[slug]', 'PUT', (SELECT id FROM system_features WHERE slug = 'amenidades'), 'WRITE'),
('/api/admin/amenidades/[slug]', 'DELETE', (SELECT id FROM system_features WHERE slug = 'amenidades'), 'DELETE'),

-- Proximidades
('/admin/proximidades', 'GET', (SELECT id FROM system_features WHERE slug = 'proximidades'), 'READ'),
('/admin/proximidades/novo', 'GET', (SELECT id FROM system_features WHERE slug = 'proximidades'), 'WRITE'),
('/admin/proximidades/[id]/editar', 'GET', (SELECT id FROM system_features WHERE slug = 'proximidades'), 'WRITE'),
('/api/admin/proximidades', 'GET', (SELECT id FROM system_features WHERE slug = 'proximidades'), 'READ'),
('/api/admin/proximidades', 'POST', (SELECT id FROM system_features WHERE slug = 'proximidades'), 'WRITE'),
('/api/admin/proximidades/[slug]', 'GET', (SELECT id FROM system_features WHERE slug = 'proximidades'), 'READ'),
('/api/admin/proximidades/[slug]', 'PUT', (SELECT id FROM system_features WHERE slug = 'proximidades'), 'WRITE'),
('/api/admin/proximidades/[slug]', 'DELETE', (SELECT id FROM system_features WHERE slug = 'proximidades'), 'DELETE'),

-- Categorias de Amenidades
('/admin/categorias-amenidades', 'GET', (SELECT id FROM system_features WHERE slug = 'categorias-de-amenidades'), 'READ'),
('/admin/categorias-amenidades/novo', 'GET', (SELECT id FROM system_features WHERE slug = 'categorias-de-amenidades'), 'WRITE'),
('/admin/categorias-amenidades/[id]/editar', 'GET', (SELECT id FROM system_features WHERE slug = 'categorias-de-amenidades'), 'WRITE'),
('/api/admin/categorias-amenidades', 'GET', (SELECT id FROM system_features WHERE slug = 'categorias-de-amenidades'), 'READ'),
('/api/admin/categorias-amenidades', 'POST', (SELECT id FROM system_features WHERE slug = 'categorias-de-amenidades'), 'WRITE'),
('/api/admin/categorias-amenidades/[id]', 'GET', (SELECT id FROM system_features WHERE slug = 'categorias-de-amenidades'), 'READ'),
('/api/admin/categorias-amenidades/[id]', 'PUT', (SELECT id FROM system_features WHERE slug = 'categorias-de-amenidades'), 'WRITE'),
('/api/admin/categorias-amenidades/[id]', 'DELETE', (SELECT id FROM system_features WHERE slug = 'categorias-de-amenidades'), 'DELETE'),

-- Categorias de Proximidades
('/admin/categorias-proximidades', 'GET', (SELECT id FROM system_features WHERE slug = 'categorias-de-proximidades'), 'READ'),
('/admin/categorias-proximidades/novo', 'GET', (SELECT id FROM system_features WHERE slug = 'categorias-de-proximidades'), 'WRITE'),
('/admin/categorias-proximidades/[id]/editar', 'GET', (SELECT id FROM system_features WHERE slug = 'categorias-de-proximidades'), 'WRITE'),
('/api/admin/categorias-proximidades', 'GET', (SELECT id FROM system_features WHERE slug = 'categorias-de-proximidades'), 'READ'),
('/api/admin/categorias-proximidades', 'POST', (SELECT id FROM system_features WHERE slug = 'categorias-de-proximidades'), 'WRITE'),
('/api/admin/categorias-proximidades/[id]', 'GET', (SELECT id FROM system_features WHERE slug = 'categorias-de-proximidades'), 'READ'),
('/api/admin/categorias-proximidades/[id]', 'PUT', (SELECT id FROM system_features WHERE slug = 'categorias-de-proximidades'), 'WRITE'),
('/api/admin/categorias-proximidades/[id]', 'DELETE', (SELECT id FROM system_features WHERE slug = 'categorias-de-proximidades'), 'DELETE')
ON CONFLICT (route_pattern, method) DO NOTHING;

SELECT COUNT(*) as rotas_adicionadas FROM route_permissions_config WHERE route_pattern LIKE '%amenidades%' OR route_pattern LIKE '%proximidades%';




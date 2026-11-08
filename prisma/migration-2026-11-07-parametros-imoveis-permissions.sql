-- Corrige permissões da feature parametros_imoveis (id 54).
-- A rota /api/admin/parametros/imoveis exige READ (GET) e UPDATE (PUT), mas a feature só tinha
-- 'execute' para o perfil 42. Resultado: administradores de tenant recebiam 403 ao salvar a
-- chave PIX (a tela mostrava o erro e nada era persistido).
-- Idempotente: pode ser executada mais de uma vez.

INSERT INTO permissions (feature_id, action)
SELECT 54, a FROM (VALUES ('read'), ('update')) AS v(a)
ON CONFLICT (feature_id, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.id
FROM (VALUES (42), (47)) AS r(role_id)
JOIN permissions p ON p.feature_id = 54 AND p.action IN ('read', 'update')
ON CONFLICT (role_id, permission_id) DO NOTHING;

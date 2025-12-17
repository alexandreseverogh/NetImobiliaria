-- ============================================================
-- MIGRATION 005: Criar permissions faltantes
-- Data: 2025-10-29
-- ============================================================

-- Listar features SEM permissions
SELECT 
    sf.id,
    sf.name,
    sf.slug,
    COUNT(p.id) as qtd_permissions
FROM system_features sf
LEFT JOIN permissions p ON p.feature_id = sf.id
WHERE sf.is_active = true
GROUP BY sf.id, sf.name, sf.slug
HAVING COUNT(p.id) = 0;

\echo ''
\echo 'Criando permissions para features sem permissions...'
\echo ''

-- Criar permissions padrão (CREATE, READ, UPDATE, DELETE) para cada feature
INSERT INTO permissions (feature_id, action, description)
SELECT 
    sf.id,
    action,
    action || ' em ' || sf.name
FROM system_features sf
CROSS JOIN (VALUES ('create'), ('read'), ('update'), ('delete')) AS actions(action)
WHERE sf.is_active = true
  AND NOT EXISTS (
      SELECT 1 FROM permissions p 
      WHERE p.feature_id = sf.id 
      AND p.action = actions.action
  )
ORDER BY sf.id, action;

-- Verificar quantas permissions foram criadas
SELECT 
    'Permissions criadas' as status,
    COUNT(*) as total
FROM permissions
WHERE created_at >= NOW() - INTERVAL '1 minute';

\echo ''

-- Atribuir automaticamente ao Super Admin
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT 
    (SELECT id FROM user_roles WHERE name = 'Super Admin' OR level = 10 LIMIT 1),
    p.id,
    NOW()
FROM permissions p
WHERE NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.permission_id = p.id 
    AND rp.role_id = (SELECT id FROM user_roles WHERE name = 'Super Admin' OR level = 10 LIMIT 1)
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

\echo ''
\echo '✅ Permissions criadas e atribuídas ao Super Admin!'
\echo ''

-- Resumo final
SELECT 
    sf.name as funcionalidade,
    COUNT(DISTINCT p.id) as permissions,
    COUNT(DISTINCT rp.role_id) as perfis_com_acesso
FROM system_features sf
LEFT JOIN permissions p ON p.feature_id = sf.id
LEFT JOIN role_permissions rp ON rp.permission_id = p.id
WHERE sf.is_active = true
GROUP BY sf.id, sf.name
ORDER BY sf.name
LIMIT 15;




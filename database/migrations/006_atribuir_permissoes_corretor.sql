-- Atribuir permissões READ para Corretor nas funcionalidades principais

\echo 'Atribuindo permissões READ para perfil Corretor...'
\echo ''

-- Funcionalidades que Corretor deve ter acesso READ
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT 
    ur.id as role_id,
    p.id as permission_id,
    NOW()
FROM user_roles ur
CROSS JOIN permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Corretor'
  AND p.action = 'read'
  AND sf.slug IN (
      'clientes',
      'proprietarios',
      'imoveis',
      'amenidades',
      'proximidades',
      'categorias-de-amenidades',
      'categorias-de-proximidades'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

\echo ''
\echo 'Verificando permissões do Corretor:'
\echo ''

SELECT 
    sf.name as funcionalidade,
    p.action,
    rp.granted_at
FROM user_roles ur
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Corretor'
ORDER BY sf.name, p.action;




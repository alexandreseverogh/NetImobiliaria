-- Corrigir permissions respeitando Crud_Execute

\echo 'Analisando campo Crud_Execute...'
SELECT 
    "Crud_Execute",
    COUNT(*) as qtd_features
FROM system_features 
WHERE is_active = true 
GROUP BY "Crud_Execute";

\echo ''
\echo 'Removendo permissions incorretas...'

-- Deletar TODAS as permissions criadas incorretamente
DELETE FROM role_permissions WHERE permission_id IN (SELECT id FROM permissions);
DELETE FROM permissions;

\echo ''
\echo 'Recriando permissions CORRETAMENTE baseado em Crud_Execute...'

-- CRUD: criar 4 permissions (minúsculas)
INSERT INTO permissions (feature_id, action, description)
SELECT 
    sf.id,
    action,
    action || ' em ' || sf.name
FROM system_features sf
CROSS JOIN (VALUES ('create'), ('read'), ('update'), ('delete')) AS actions(action)
WHERE sf."Crud_Execute" = 'CRUD'
  AND sf.is_active = true;

-- EXECUTE: criar 1 permission
INSERT INTO permissions (feature_id, action, description)
SELECT 
    sf.id,
    'execute',
    'Executar ' || sf.name
FROM system_features sf
WHERE sf."Crud_Execute" = 'EXECUTE'
  AND sf.is_active = true;

\echo ''
\echo 'Atribuindo ao Super Admin...'

-- Atribuir TODAS ao Super Admin
INSERT INTO role_permissions (role_id, permission_id, granted_at)
SELECT 
    (SELECT id FROM user_roles WHERE name = 'Super Admin' OR level >= 10 LIMIT 1),
    p.id,
    NOW()
FROM permissions p;

\echo ''
\echo 'Verificação final:'

-- Mostrar distribuição correta
SELECT 
    sf."Crud_Execute" as tipo,
    COUNT(DISTINCT sf.id) as features,
    COUNT(p.id) as total_permissions,
    STRING_AGG(DISTINCT p.action, ', ' ORDER BY p.action) as acoes
FROM system_features sf
LEFT JOIN permissions p ON p.feature_id = sf.id
WHERE sf.is_active = true
GROUP BY sf."Crud_Execute"
ORDER BY sf."Crud_Execute";

\echo ''
\echo 'Total de permissions:'
SELECT COUNT(*) as total_permissions FROM permissions;

\echo ''
\echo '✅ Permissions corrigidas!'




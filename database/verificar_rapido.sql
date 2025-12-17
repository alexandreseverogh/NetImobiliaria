-- VERIFICAÇÃO RÁPIDA: Permissões do Admin

SELECT 
    'Permissões do Admin' as tipo,
    ur.name as role,
    sf.name as feature,
    p.action,
    CASE WHEN rp.id IS NOT NULL THEN '✅ TEM' ELSE '❌ NÃO TEM' END as status
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
LEFT JOIN role_permissions rp ON ur.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
LEFT JOIN system_features sf ON p.feature_id = sf.id
WHERE (u.username = 'admin' OR u.email = 'admin@123')
  AND (sf.name = 'Configuração da Sidebar' OR sf.name IS NULL)
ORDER BY sf.name NULLS FIRST;


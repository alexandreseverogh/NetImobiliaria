-- Verify what was created
SELECT 'user_roles' as table_name, COUNT(*) as count FROM user_roles
UNION ALL
SELECT 'system_features' as table_name, COUNT(*) as count FROM system_features
UNION ALL
SELECT 'permissions' as table_name, COUNT(*) as count FROM permissions
UNION ALL
SELECT 'role_permissions' as table_name, COUNT(*) as count FROM role_permissions
UNION ALL
SELECT 'user_role_assignments' as table_name, COUNT(*) as count FROM user_role_assignments;












-- Verificar tabelas de permissões existentes
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('system_features', 'permissions', 'user_roles', 'user_role_assignments', 'role_permissions', 'audit_logs')
ORDER BY table_name;












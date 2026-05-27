
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('system_modules', 'system_segments', 'tenants', 'tenant_modules', 'users', 'user_tenant_membership', 'perfis')
ORDER BY table_name, ordinal_position;

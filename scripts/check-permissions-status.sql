-- Check current status of permission tables
SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
FROM (
    VALUES 
        ('system_features'),
        ('permissions'),
        ('user_roles'),
        ('user_role_assignments'),
        ('role_permissions'),
        ('audit_logs')
) AS expected_tables(table_name)
LEFT JOIN information_schema.tables t 
    ON t.table_name = expected_tables.table_name 
    AND t.table_schema = 'public'
ORDER BY table_name;












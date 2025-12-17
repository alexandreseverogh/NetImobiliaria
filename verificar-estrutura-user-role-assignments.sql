-- Verificar estrutura da tabela user_role_assignments
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_role_assignments' 
ORDER BY ordinal_position;



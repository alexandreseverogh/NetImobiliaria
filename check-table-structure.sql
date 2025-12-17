-- Verificar estrutura da tabela system_categorias
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'system_categorias' 
ORDER BY ordinal_position;

-- Verificar dados existentes
SELECT * FROM system_categorias LIMIT 5;

-- Verificar se a tabela existe
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'system_categorias'
) as table_exists;





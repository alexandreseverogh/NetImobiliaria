-- Verificar se a tabela users tem campo telefone
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name = 'telefone';












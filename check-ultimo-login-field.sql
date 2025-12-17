-- Verificar se o campo ultimo_login existe na tabela users
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'ultimo_login';

-- Se não existir, criar o campo
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'ultimo_login'
    ) THEN
        ALTER TABLE users ADD COLUMN ultimo_login TIMESTAMP;
        RAISE NOTICE 'Campo ultimo_login adicionado à tabela users';
    ELSE
        RAISE NOTICE 'Campo ultimo_login já existe na tabela users';
    END IF;
END $$;

-- Verificar novamente
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'ultimo_login';



-- ============================================
-- ADICIONAR CAMPO ultimo_login NA TABELA USERS
-- ============================================

-- 1. Verificar se o campo existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' 
            AND column_name = 'ultimo_login'
        ) THEN 'Campo ultimo_login JÁ EXISTE'
        ELSE 'Campo ultimo_login NÃO EXISTE - será criado'
    END as status;

-- 2. Adicionar campo se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'ultimo_login'
    ) THEN
        ALTER TABLE users ADD COLUMN ultimo_login TIMESTAMP;
        RAISE NOTICE 'Campo ultimo_login adicionado com sucesso à tabela users';
    ELSE
        RAISE NOTICE 'Campo ultimo_login já existe na tabela users';
    END IF;
END $$;

-- 3. Verificar estrutura da tabela users
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 4. Verificar dados atuais
SELECT 
    id, 
    username, 
    email,
    ultimo_login,
    created_at
FROM users 
ORDER BY id;




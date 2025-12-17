-- ============================================
-- ADICIONAR CAMPOS 2FA NA TABELA USERS
-- ============================================

-- Verificar se campos já existem antes de criar
DO $$
BEGIN
    -- Campo two_fa_enabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'two_fa_enabled'
    ) THEN
        ALTER TABLE users ADD COLUMN two_fa_enabled BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Campo two_fa_enabled adicionado à tabela users';
    ELSE
        RAISE NOTICE 'ℹ️ Campo two_fa_enabled já existe na tabela users';
    END IF;

    -- Campo two_fa_secret
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'two_fa_secret'
    ) THEN
        ALTER TABLE users ADD COLUMN two_fa_secret VARCHAR(255);
        RAISE NOTICE '✅ Campo two_fa_secret adicionado à tabela users';
    ELSE
        RAISE NOTICE 'ℹ️ Campo two_fa_secret já existe na tabela users';
    END IF;

    -- Campo ultimo_login (caso não exista)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'ultimo_login'
    ) THEN
        ALTER TABLE users ADD COLUMN ultimo_login TIMESTAMP;
        RAISE NOTICE '✅ Campo ultimo_login adicionado à tabela users';
    ELSE
        RAISE NOTICE 'ℹ️ Campo ultimo_login já existe na tabela users';
    END IF;
END $$;

-- Verificar estrutura final da tabela users
SELECT 
    'ESTRUTURA FINAL DA TABELA USERS' as verificacao;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('two_fa_enabled', 'two_fa_secret', 'ultimo_login')
ORDER BY column_name;

-- Mostrar todos os campos da tabela users
SELECT 
    'TODOS OS CAMPOS DA TABELA USERS' as verificacao;

SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

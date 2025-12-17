-- =====================================================
-- ADICIONAR CAMPO TELEFONE À TABELA USERS
-- =====================================================

-- Adicionar campo telefone se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'telefone'
    ) THEN
        ALTER TABLE users ADD COLUMN telefone VARCHAR(20);
        RAISE NOTICE '✅ Campo telefone adicionado à tabela users';
    ELSE
        RAISE NOTICE 'ℹ️ Campo telefone já existe na tabela users';
    END IF;
END $$;

-- Atualizar usuários existentes com telefones de exemplo
UPDATE users 
SET telefone = CASE 
    WHEN username = 'admin' THEN '(81) 99901-2600'
    WHEN username = 'corretor1' THEN '(81) 99901-2601'
    WHEN username = 'assistente1' THEN '(81) 99901-2602'
    ELSE telefone
END
WHERE telefone IS NULL;

-- Verificar resultado
SELECT username, nome, telefone FROM users ORDER BY username;












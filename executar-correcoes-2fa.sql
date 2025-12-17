-- Execute no pgAdmin4 para corrigir problemas 2FA

-- 1. Criar tabela user_2fa_config (para validação)
CREATE TABLE IF NOT EXISTS user_2fa_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    method VARCHAR(20) NOT NULL DEFAULT 'email',
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    secret TEXT,
    backup_codes TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, method)
);

-- 2. Adicionar coluna result na tabela login_attempts se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'login_attempts' 
        AND column_name = 'result'
    ) THEN
        ALTER TABLE login_attempts ADD COLUMN result VARCHAR(50);
        RAISE NOTICE 'Coluna result adicionada à tabela login_attempts';
    ELSE
        RAISE NOTICE 'Coluna result já existe na tabela login_attempts';
    END IF;
END $$;

-- 3. Verificar se as correções foram aplicadas
SELECT 'VERIFICAÇÃO:' as status,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_2fa_config') 
            THEN '✅ user_2fa_config: CRIADA' 
            ELSE '❌ user_2fa_config: NÃO EXISTE' 
       END as tabela_config;

SELECT 'VERIFICAÇÃO:' as status,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'login_attempts' AND column_name = 'result') 
            THEN '✅ Coluna result: EXISTE' 
            ELSE '❌ Coluna result: NÃO EXISTE' 
       END as coluna_result;

-- 4. Mostrar estrutura das tabelas
SELECT 'ESTRUTURA LOGIN_ATTEMPTS:' as info, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'login_attempts' 
ORDER BY ordinal_position;

-- Corrigir tabelas 2FA faltantes
-- Execute no pgAdmin4

-- 1. Criar tabela user_2fa_config (para validação de códigos)
CREATE TABLE IF NOT EXISTS user_2fa_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    method VARCHAR(20) NOT NULL DEFAULT 'email',
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    secret TEXT, -- Para TOTP (não usado no email)
    backup_codes TEXT[], -- Códigos de backup
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraint para garantir um método por usuário
    UNIQUE(user_id, method)
);

-- 2. Verificar estrutura da tabela login_attempts
\d login_attempts;

-- 3. Se a coluna 'result' não existir, adicionar
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'login_attempts' 
        AND column_name = 'result'
    ) THEN
        ALTER TABLE login_attempts ADD COLUMN result VARCHAR(50);
    END IF;
END $$;

-- 4. Verificar se as tabelas foram criadas/corrigidas
SELECT 'TABELAS 2FA:' as verificacao,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_2fa_config') 
            THEN 'user_2fa_config: EXISTE' 
            ELSE 'user_2fa_config: NÃO EXISTE' 
       END as tabela_config;

-- 5. Verificar colunas da tabela login_attempts
SELECT 'COLUNAS LOGIN_ATTEMPTS:' as verificacao, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'login_attempts' 
ORDER BY ordinal_position;



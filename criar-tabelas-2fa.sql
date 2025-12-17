-- Script para criar tabelas necessárias para 2FA
-- Execute este script no pgAdmin4

-- 1. Criar tabela user_2fa_codes
CREATE TABLE IF NOT EXISTS user_2fa_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    method VARCHAR(20) NOT NULL DEFAULT 'email',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- 2. Criar tabela audit_2fa_logs
CREATE TABLE IF NOT EXISTS audit_2fa_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'code_sent', 'code_validated', 'code_failed', etc.
    method VARCHAR(20) NOT NULL DEFAULT 'email',
    metadata JSONB, -- Dados adicionais como IP, user agent, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT
);

-- 3. Criar tabela user_2fa_config (caso não exista)
CREATE TABLE IF NOT EXISTS user_2fa_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method VARCHAR(20) NOT NULL DEFAULT 'email',
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    secret_key VARCHAR(255), -- Para TOTP (não usado no email)
    backup_codes TEXT[], -- Códigos de backup
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraint para garantir um método por usuário
    UNIQUE(user_id, method),
    
    -- Índices serão criados após a tabela
);

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_user_id ON user_2fa_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_code ON user_2fa_codes(code);
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_expires_at ON user_2fa_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_used ON user_2fa_codes(used);

CREATE INDEX IF NOT EXISTS idx_audit_2fa_logs_user_id ON audit_2fa_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_2fa_logs_action ON audit_2fa_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_2fa_logs_created_at ON audit_2fa_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_user_2fa_config_user_id ON user_2fa_config(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_config_method ON user_2fa_config(method);
CREATE INDEX IF NOT EXISTS idx_user_2fa_config_enabled ON user_2fa_config(is_enabled);

-- 5. Comentários para documentação
COMMENT ON TABLE user_2fa_codes IS 'Armazena códigos 2FA temporários enviados por email';
COMMENT ON TABLE audit_2fa_logs IS 'Log de auditoria para atividades 2FA';
COMMENT ON TABLE user_2fa_config IS 'Configurações 2FA por usuário e método';

-- 5. Verificar se as tabelas foram criadas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('user_2fa_codes', 'audit_2fa_logs', 'user_2fa_config')
ORDER BY tablename;

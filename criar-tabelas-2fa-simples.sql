-- Criar tabelas essenciais para 2FA
-- Execute no pgAdmin4

-- Tabela para códigos 2FA
CREATE TABLE IF NOT EXISTS user_2fa_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    code VARCHAR(10) NOT NULL,
    method VARCHAR(20) NOT NULL DEFAULT 'email',
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Tabela para logs de auditoria 2FA
CREATE TABLE IF NOT EXISTS audit_2fa_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    method VARCHAR(20) NOT NULL DEFAULT 'email',
    metadata TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_user_id ON user_2fa_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_code ON user_2fa_codes(code);
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_expires_at ON user_2fa_codes(expires_at);

CREATE INDEX IF NOT EXISTS idx_audit_2fa_logs_user_id ON audit_2fa_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_2fa_logs_action ON audit_2fa_logs(action);

-- Verificar tabelas criadas
SELECT tablename FROM pg_tables WHERE tablename LIKE '%2fa%';

-- Script ultra simples para criar tabelas 2FA
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

-- Verificar se as tabelas foram criadas
SELECT tablename FROM pg_tables WHERE tablename LIKE '%2fa%';

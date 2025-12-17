-- ===============================================
-- SCRIPT DE CRIAÇÃO DAS TABELAS - SISTEMA ROBUSTO
-- Net Imobiliária - Fase 1 - Dia 1-2
-- ===============================================

-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ===============================================
-- 1. TABELAS DE AUTENTICAÇÃO E 2FA
-- ===============================================

-- Usuários do sistema
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(100),
    telefone VARCHAR(20),
    avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Configurações 2FA por usuário
CREATE TABLE user_2fa_config (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    method VARCHAR(20) NOT NULL DEFAULT 'email',
    email VARCHAR(100),
    phone_number VARCHAR(20),
    secret_key VARCHAR(32),
    is_enabled BOOLEAN DEFAULT false,
    backup_codes TEXT[],
    last_used TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, method)
);

-- Códigos 2FA temporários
CREATE TABLE user_2fa_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    method VARCHAR(20) NOT NULL DEFAULT 'email',
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Configurações globais de 2FA
CREATE TABLE system_2fa_settings (
    id SERIAL PRIMARY KEY,
    enabled BOOLEAN DEFAULT true,
    required_for_roles INTEGER[],
    optional_for_roles INTEGER[],
    code_length INTEGER DEFAULT 6,
    code_expiry_minutes INTEGER DEFAULT 10,
    max_attempts INTEGER DEFAULT 3,
    email_template TEXT,
    email_from VARCHAR(100) DEFAULT 'noreply@localhost',
    email_subject VARCHAR(200) DEFAULT 'Código de Verificação - Net Imobiliária',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sessões ativas
CREATE TABLE user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_2fa_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs de tentativas de login
CREATE TABLE login_attempts (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50),
    email VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT false,
    failure_reason VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- 2. TABELAS DE PERFIS E PERMISSÕES
-- ===============================================

-- Perfis de usuário
CREATE TABLE user_roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    level INTEGER NOT NULL,
    is_system_role BOOLEAN DEFAULT false,
    requires_2fa BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Associação usuário-perfil
CREATE TABLE user_role_assignments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES user_roles(id) ON DELETE CASCADE,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id)
);

-- Funcionalidades do sistema
CREATE TABLE system_features (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    url VARCHAR(255),
    icon VARCHAR(50),
    category VARCHAR(50),
    parent_id INTEGER REFERENCES system_features(id),
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    requires_permission BOOLEAN DEFAULT true,
    requires_2fa BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- Permissões específicas
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    feature_id INTEGER REFERENCES system_features(id) ON DELETE CASCADE,
    action VARCHAR(20) NOT NULL,
    description TEXT,
    is_system_permission BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(feature_id, action)
);

-- Associação perfil-permissão
CREATE TABLE role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES user_roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    granted_by INTEGER REFERENCES users(id),
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- ===============================================
-- 3. SISTEMA DE AUDITORIA
-- ===============================================

-- Logs de auditoria
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs específicos de 2FA
CREATE TABLE audit_2fa_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    method VARCHAR(20),
    success BOOLEAN DEFAULT false,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- 4. CONFIGURAÇÕES DE EMAIL
-- ===============================================

-- Configurações de email do sistema
CREATE TABLE email_settings (
    id SERIAL PRIMARY KEY,
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_username VARCHAR(255),
    smtp_password VARCHAR(255),
    smtp_secure BOOLEAN DEFAULT false, -- false para desenvolvimento
    from_email VARCHAR(255),
    from_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    environment VARCHAR(20) DEFAULT 'development', -- development/production
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates de email
CREATE TABLE email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(255),
    html_content TEXT,
    text_content TEXT,
    variables JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logs de emails enviados
CREATE TABLE email_logs (
    id SERIAL PRIMARY KEY,
    to_email VARCHAR(255),
    subject VARCHAR(255),
    template_name VARCHAR(100),
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    sent_at TIMESTAMP,
    environment VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ===============================================
-- ÍNDICES PARA PERFORMANCE
-- ===============================================

-- Índices para tabela users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Índices para tabela user_2fa_codes
CREATE INDEX idx_2fa_codes_user_id ON user_2fa_codes(user_id);
CREATE INDEX idx_2fa_codes_expires_at ON user_2fa_codes(expires_at);
CREATE INDEX idx_2fa_codes_code ON user_2fa_codes(code);

-- Índices para tabela user_sessions
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_token_hash ON user_sessions(token_hash);

-- Índices para tabela login_attempts
CREATE INDEX idx_login_attempts_username ON login_attempts(username);
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_created_at ON login_attempts(created_at);
CREATE INDEX idx_login_attempts_ip_address ON login_attempts(ip_address);

-- Índices para tabela audit_logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Índices para tabela user_role_assignments
CREATE INDEX idx_user_role_assignments_user_id ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_role_id ON user_role_assignments(role_id);
CREATE INDEX idx_user_role_assignments_is_active ON user_role_assignments(is_active);

-- Índices para tabela system_features
CREATE INDEX idx_system_features_parent_id ON system_features(parent_id);
CREATE INDEX idx_system_features_category ON system_features(category);
CREATE INDEX idx_system_features_is_active ON system_features(is_active);
CREATE INDEX idx_system_features_order_index ON system_features(order_index);

-- ===============================================
-- TRIGGERS PARA AUDITORIA AUTOMÁTICA
-- ===============================================

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_2fa_config_updated_at BEFORE UPDATE ON user_2fa_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_roles_updated_at BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_features_updated_at BEFORE UPDATE ON system_features
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_2fa_settings_updated_at BEFORE UPDATE ON system_2fa_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_settings_updated_at BEFORE UPDATE ON email_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- COMENTÁRIOS DAS TABELAS
-- ===============================================

COMMENT ON TABLE users IS 'Usuários do sistema administrativo';
COMMENT ON TABLE user_2fa_config IS 'Configurações de 2FA por usuário';
COMMENT ON TABLE user_2fa_codes IS 'Códigos temporários de 2FA';
COMMENT ON TABLE system_2fa_settings IS 'Configurações globais do sistema 2FA';
COMMENT ON TABLE user_sessions IS 'Sessões ativas dos usuários';
COMMENT ON TABLE login_attempts IS 'Logs de tentativas de login';
COMMENT ON TABLE user_roles IS 'Perfis/roles dos usuários';
COMMENT ON TABLE user_role_assignments IS 'Associação usuário-perfil';
COMMENT ON TABLE system_features IS 'Funcionalidades do sistema';
COMMENT ON TABLE permissions IS 'Permissões específicas';
COMMENT ON TABLE role_permissions IS 'Associação perfil-permissão';
COMMENT ON TABLE audit_logs IS 'Logs de auditoria do sistema';
COMMENT ON TABLE audit_2fa_logs IS 'Logs específicos de 2FA';
COMMENT ON TABLE email_settings IS 'Configurações de email do sistema';
COMMENT ON TABLE email_templates IS 'Templates de email';
COMMENT ON TABLE email_logs IS 'Logs de emails enviados';

-- ===============================================
-- SCRIPT CONCLUÍDO
-- ===============================================

-- Verificar se todas as tabelas foram criadas
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'users', 'user_2fa_config', 'user_2fa_codes', 'system_2fa_settings',
        'user_sessions', 'login_attempts', 'user_roles', 'user_role_assignments',
        'system_features', 'permissions', 'role_permissions', 'audit_logs',
        'audit_2fa_logs', 'email_settings', 'email_templates', 'email_logs'
    )
ORDER BY tablename;

-- Contar total de tabelas criadas
SELECT COUNT(*) as total_tables_created FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN (
        'users', 'user_2fa_config', 'user_2fa_codes', 'system_2fa_settings',
        'user_sessions', 'login_attempts', 'user_roles', 'user_role_assignments',
        'system_features', 'permissions', 'role_permissions', 'audit_logs',
        'audit_2fa_logs', 'email_settings', 'email_templates', 'email_logs'
    );




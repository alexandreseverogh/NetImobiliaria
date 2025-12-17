-- Índices para Performance - Net Imobiliária
-- FASE 1.1 - Dia 4: Criar índices para performance

-- ==============================================
-- ÍNDICES PARA TABELA USERS
-- ==============================================

-- Índice para busca por email (login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Índice para busca por username (login)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Índice para usuários ativos
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active) WHERE is_active = true;

-- Índice para último login (monitoramento)
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);

-- Índice para tentativas de login falhadas
CREATE INDEX IF NOT EXISTS idx_users_failed_attempts ON users(failed_login_attempts);

-- Índice para contas bloqueadas
CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(locked_until) WHERE locked_until IS NOT NULL;

-- Índice composto para login seguro
CREATE INDEX IF NOT EXISTS idx_users_login_composite ON users(email, is_active, locked_until);

-- ==============================================
-- ÍNDICES PARA TABELA USER_2FA_CODES
-- ==============================================

-- Índice para códigos não expirados
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_active ON user_2fa_codes(user_id, code, expires_at) 
WHERE used = false AND expires_at > NOW();

-- Índice para limpeza de códigos expirados
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_expires ON user_2fa_codes(expires_at);

-- Índice para códigos por usuário
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_user_id ON user_2fa_codes(user_id);

-- ==============================================
-- ÍNDICES PARA TABELA USER_SESSIONS
-- ==============================================

-- Índice para sessões ativas por usuário
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);

-- Índice para sessões por token
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);

-- Índice para sessões expiradas (limpeza)
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Índice composto para sessões ativas
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, expires_at) 
WHERE expires_at > NOW();

-- ==============================================
-- ÍNDICES PARA TABELA LOGIN_ATTEMPTS
-- ==============================================

-- Índice para tentativas por IP
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);

-- Índice para tentativas por email
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);

-- Índice para tentativas recentes (rate limiting)
CREATE INDEX IF NOT EXISTS idx_login_attempts_timestamp ON login_attempts(attempted_at);

-- Índice composto para rate limiting
CREATE INDEX IF NOT EXISTS idx_login_attempts_rate_limit ON login_attempts(ip_address, attempted_at);

-- ==============================================
-- ÍNDICES PARA TABELA AUDIT_LOGS
-- ==============================================

-- Índice para logs por ação
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Índice para logs por usuário
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Índice para logs por recurso
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);

-- Índice para logs por data (consultas temporais)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Índice composto para consultas de auditoria
CREATE INDEX IF NOT EXISTS idx_audit_logs_composite ON audit_logs(user_id, action, created_at);

-- ==============================================
-- ÍNDICES PARA TABELA USER_ROLE_ASSIGNMENTS
-- ==============================================

-- Índice para atribuições por usuário
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id ON user_role_assignments(user_id);

-- Índice para atribuições por perfil
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON user_role_assignments(role_id);

-- Índice composto para consultas de permissões
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_composite ON user_role_assignments(user_id, role_id);

-- ==============================================
-- ÍNDICES PARA TABELA ROLE_PERMISSIONS
-- ==============================================

-- Índice para permissões por perfil
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);

-- Índice para permissões por funcionalidade
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- Índice composto para consultas de permissões
CREATE INDEX IF NOT EXISTS idx_role_permissions_composite ON role_permissions(role_id, permission_id);

-- ==============================================
-- ÍNDICES PARA TABELA SYSTEM_FEATURES
-- ==============================================

-- Índice para funcionalidades ativas
CREATE INDEX IF NOT EXISTS idx_system_features_is_active ON system_features(is_active) WHERE is_active = true;

-- Índice para funcionalidades por categoria
CREATE INDEX IF NOT EXISTS idx_system_features_category ON system_features(category);

-- Índice para funcionalidades por ordem
CREATE INDEX IF NOT EXISTS idx_system_features_order_index ON system_features(order_index);

-- ==============================================
-- ÍNDICES PARA TABELA PERMISSIONS
-- ==============================================

-- Índice para permissões por funcionalidade
CREATE INDEX IF NOT EXISTS idx_permissions_feature_id ON permissions(feature_id);

-- Índice para permissões por ação
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);

-- ==============================================
-- ÍNDICES PARA TABELA EMAIL_LOGS
-- ==============================================

-- Índice para logs por template
CREATE INDEX IF NOT EXISTS idx_email_logs_template_name ON email_logs(template_name);

-- Índice para logs por status
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- Índice para logs por data
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at);

-- ==============================================
-- ÍNDICES PARA TABELA USER_2FA_CONFIG
-- ==============================================

-- Índice para configurações 2FA ativas
CREATE INDEX IF NOT EXISTS idx_user_2fa_config_enabled ON user_2fa_config(user_id, is_enabled) 
WHERE is_enabled = true;

-- Índice para configurações por método
CREATE INDEX IF NOT EXISTS idx_user_2fa_config_method ON user_2fa_config(method);

-- ==============================================
-- ESTATÍSTICAS E ANÁLISE
-- ==============================================

-- Atualizar estatísticas do PostgreSQL
ANALYZE;

-- Verificar índices criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;



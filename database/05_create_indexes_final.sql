-- Índices Finais para Sistema Robusto - Net Imobiliária
-- FASE 1.1 - Dia 4: Criar índices APENAS para tabelas do sistema robusto

-- ==============================================
-- ÍNDICES PARA TABELA USERS (Sistema Robusto)
-- ==============================================

-- Índice para busca por email (login)
CREATE INDEX IF NOT EXISTS idx_users_email_robust ON users(email);

-- Índice para busca por username (login)
CREATE INDEX IF NOT EXISTS idx_users_username_robust ON users(username);

-- Índice para usuários ativos
CREATE INDEX IF NOT EXISTS idx_users_is_active_robust ON users(is_active) WHERE is_active = true;

-- Índice para último login (monitoramento)
CREATE INDEX IF NOT EXISTS idx_users_last_login_robust ON users(last_login);

-- Índice para tentativas de login falhadas
CREATE INDEX IF NOT EXISTS idx_users_failed_attempts_robust ON users(failed_login_attempts);

-- Índice para contas bloqueadas
CREATE INDEX IF NOT EXISTS idx_users_locked_until_robust ON users(locked_until) WHERE locked_until IS NOT NULL;

-- ==============================================
-- ÍNDICES PARA TABELA USER_2FA_CODES (Sistema Robusto)
-- ==============================================

-- Índice para códigos não expirados
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_active_robust ON user_2fa_codes(user_id, code, expires_at) 
WHERE used = false AND expires_at > NOW();

-- Índice para limpeza de códigos expirados
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_expires_robust ON user_2fa_codes(expires_at);

-- Índice para códigos por usuário
CREATE INDEX IF NOT EXISTS idx_user_2fa_codes_user_id_robust ON user_2fa_codes(user_id);

-- ==============================================
-- ÍNDICES PARA TABELA USER_SESSIONS (Sistema Robusto)
-- ==============================================

-- Índice para sessões ativas por usuário
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id_robust ON user_sessions(user_id);

-- Índice para sessões por token
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash_robust ON user_sessions(token_hash);

-- Índice para sessões expiradas (limpeza)
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at_robust ON user_sessions(expires_at);

-- ==============================================
-- ÍNDICES PARA TABELA LOGIN_ATTEMPTS (Sistema Robusto)
-- ==============================================

-- Índice para tentativas por IP
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_robust ON login_attempts(ip_address);

-- Índice para tentativas por email
CREATE INDEX IF NOT EXISTS idx_login_attempts_email_robust ON login_attempts(email);

-- Índice para tentativas recentes (rate limiting)
CREATE INDEX IF NOT EXISTS idx_login_attempts_timestamp_robust ON login_attempts(attempted_at);

-- ==============================================
-- ÍNDICES PARA TABELA AUDIT_LOGS (Sistema Robusto)
-- ==============================================

-- Índice para logs por ação
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_robust ON audit_logs(action);

-- Índice para logs por usuário
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_robust ON audit_logs(user_id);

-- Índice para logs por recurso
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type_robust ON audit_logs(resource_type);

-- Índice para logs por data (consultas temporais)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_robust ON audit_logs(created_at);

-- ==============================================
-- ÍNDICES PARA TABELA USER_ROLE_ASSIGNMENTS (Sistema Robusto)
-- ==============================================

-- Índice para atribuições por usuário
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_user_id_robust ON user_role_assignments(user_id);

-- Índice para atribuições por perfil
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id_robust ON user_role_assignments(role_id);

-- ==============================================
-- ÍNDICES PARA TABELA ROLE_PERMISSIONS (Sistema Robusto)
-- ==============================================

-- Índice para permissões por perfil
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id_robust ON role_permissions(role_id);

-- Índice para permissões por funcionalidade
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id_robust ON role_permissions(permission_id);

-- ==============================================
-- ÍNDICES PARA TABELA SYSTEM_FEATURES (Sistema Robusto)
-- ==============================================

-- Índice para funcionalidades ativas
CREATE INDEX IF NOT EXISTS idx_system_features_is_active_robust ON system_features(is_active) WHERE is_active = true;

-- Índice para funcionalidades por categoria
CREATE INDEX IF NOT EXISTS idx_system_features_category_robust ON system_features(category);

-- Índice para funcionalidades por ordem
CREATE INDEX IF NOT EXISTS idx_system_features_order_index_robust ON system_features(order_index);

-- ==============================================
-- ÍNDICES PARA TABELA PERMISSIONS (Sistema Robusto)
-- ==============================================

-- Índice para permissões por funcionalidade
CREATE INDEX IF NOT EXISTS idx_permissions_feature_id_robust ON permissions(feature_id);

-- Índice para permissões por ação
CREATE INDEX IF NOT EXISTS idx_permissions_action_robust ON permissions(action);

-- ==============================================
-- ÍNDICES PARA TABELA EMAIL_LOGS (Sistema Robusto)
-- ==============================================

-- Índice para logs por template
CREATE INDEX IF NOT EXISTS idx_email_logs_template_name_robust ON email_logs(template_name);

-- Índice para logs por status
CREATE INDEX IF NOT EXISTS idx_email_logs_status_robust ON email_logs(status);

-- Índice para logs por data
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at_robust ON email_logs(sent_at);

-- ==============================================
-- ÍNDICES PARA TABELA USER_2FA_CONFIG (Sistema Robusto)
-- ==============================================

-- Índice para configurações 2FA ativas
CREATE INDEX IF NOT EXISTS idx_user_2fa_config_enabled_robust ON user_2fa_config(user_id, is_enabled) 
WHERE is_enabled = true;

-- Índice para configurações por método
CREATE INDEX IF NOT EXISTS idx_user_2fa_config_method_robust ON user_2fa_config(method);

-- ==============================================
-- VERIFICAÇÃO FINAL
-- ==============================================

-- Atualizar estatísticas do PostgreSQL
ANALYZE;

-- Mostrar resultado
SELECT 'Índices do sistema robusto criados com sucesso!' as status;



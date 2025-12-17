-- Triggers para Auditoria - Sistema Robusto Net Imobiliária
-- FASE 1.1 - Dia 5: Configurar triggers para auditoria

-- ==============================================
-- FUNÇÃO PARA AUDITORIA AUTOMÁTICA
-- ==============================================

-- Função para registrar mudanças nas tabelas
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    old_data JSONB;
    new_data JSONB;
    current_user_id INTEGER;
BEGIN
    -- Determinar tipo de ação
    IF TG_OP = 'DELETE' THEN
        action_type := 'DELETE';
        old_data := to_jsonb(OLD);
        new_data := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'UPDATE';
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'INSERT' THEN
        action_type := 'INSERT';
        old_data := NULL;
        new_data := to_jsonb(NEW);
    END IF;

    -- Tentar obter o ID do usuário atual (se disponível)
    BEGIN
        -- Verificar se existe uma função para obter o usuário atual
        -- Por enquanto, usar NULL como padrão
        current_user_id := NULL;
    EXCEPTION
        WHEN OTHERS THEN
            current_user_id := NULL;
    END;

    -- Inserir log de auditoria
    INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        old_data,
        new_data,
        ip_address,
        user_agent,
        created_at
    ) VALUES (
        current_user_id,
        action_type,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        old_data,
        new_data,
        inet_client_addr(),
        current_setting('application_name', true),
        NOW()
    );

    -- Retornar o registro apropriado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- TRIGGER PARA TABELA USERS
-- ==============================================

CREATE TRIGGER trigger_users_audit
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==============================================
-- TRIGGER PARA TABELA USER_2FA_CONFIG
-- ==============================================

CREATE TRIGGER trigger_user_2fa_config_audit
    AFTER INSERT OR UPDATE OR DELETE ON user_2fa_config
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==============================================
-- TRIGGER PARA TABELA USER_2FA_CODES
-- ==============================================

CREATE TRIGGER trigger_user_2fa_codes_audit
    AFTER INSERT OR UPDATE OR DELETE ON user_2fa_codes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==============================================
-- TRIGGER PARA TABELA USER_SESSIONS
-- ==============================================

CREATE TRIGGER trigger_user_sessions_audit
    AFTER INSERT OR UPDATE OR DELETE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==============================================
-- TRIGGER PARA TABELA USER_ROLES
-- ==============================================

CREATE TRIGGER trigger_user_roles_audit
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==============================================
-- TRIGGER PARA TABELA USER_ROLE_ASSIGNMENTS
-- ==============================================

CREATE TRIGGER trigger_user_role_assignments_audit
    AFTER INSERT OR UPDATE OR DELETE ON user_role_assignments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==============================================
-- TRIGGER PARA TABELA SYSTEM_FEATURES
-- ==============================================

CREATE TRIGGER trigger_system_features_audit
    AFTER INSERT OR UPDATE OR DELETE ON system_features
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==============================================
-- TRIGGER PARA TABELA PERMISSIONS
-- ==============================================

CREATE TRIGGER trigger_permissions_audit
    AFTER INSERT OR UPDATE OR DELETE ON permissions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==============================================
-- TRIGGER PARA TABELA ROLE_PERMISSIONS
-- ==============================================

CREATE TRIGGER trigger_role_permissions_audit
    AFTER INSERT OR UPDATE OR DELETE ON role_permissions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==============================================
-- TRIGGER PARA TABELA EMAIL_SETTINGS
-- ==============================================

CREATE TRIGGER trigger_email_settings_audit
    AFTER INSERT OR UPDATE OR DELETE ON email_settings
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==============================================
-- TRIGGER PARA TABELA EMAIL_TEMPLATES
-- ==============================================

CREATE TRIGGER trigger_email_templates_audit
    AFTER INSERT OR UPDATE OR DELETE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ==============================================
-- FUNÇÃO PARA ATUALIZAR TIMESTAMP
-- ==============================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================
-- TRIGGERS PARA UPDATED_AT
-- ==============================================

-- Trigger para users
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para user_2fa_config
CREATE TRIGGER trigger_user_2fa_config_updated_at
    BEFORE UPDATE ON user_2fa_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para user_roles
CREATE TRIGGER trigger_user_roles_updated_at
    BEFORE UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para system_features
CREATE TRIGGER trigger_system_features_updated_at
    BEFORE UPDATE ON system_features
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para permissions
CREATE TRIGGER trigger_permissions_updated_at
    BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para email_settings
CREATE TRIGGER trigger_email_settings_updated_at
    BEFORE UPDATE ON email_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para email_templates
CREATE TRIGGER trigger_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================
-- VERIFICAÇÃO FINAL
-- ==============================================

-- Mostrar triggers criados
SELECT 
    schemaname,
    tablename,
    triggername,
    'Trigger criado com sucesso' as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
AND t.tgname LIKE '%audit%'
ORDER BY tablename, triggername;



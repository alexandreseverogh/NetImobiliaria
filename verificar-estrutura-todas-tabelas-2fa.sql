-- ============================================
-- VERIFICAR ESTRUTURA DE TODAS AS TABELAS 2FA
-- ============================================

-- 1. Verificar se tabelas existem
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('system_2fa_settings', 'email_settings', 'email_templates', 'users') 
        THEN 'EXISTE' 
        ELSE 'NÃO EXISTE' 
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('system_2fa_settings', 'email_settings', 'email_templates', 'users')
ORDER BY table_name;

-- 2. Estrutura da tabela users
SELECT 
    'users' as tabela,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Estrutura da tabela email_settings (se existir)
SELECT 
    'email_settings' as tabela,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'email_settings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Estrutura da tabela email_templates (se existir)
SELECT 
    'email_templates' as tabela,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'email_templates' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 5. Estrutura da tabela system_2fa_settings (se existir)
SELECT 
    'system_2fa_settings' as tabela,
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'system_2fa_settings' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Verificar dados atuais (apenas se tabelas existirem)
-- Users
SELECT 'users' as tabela, COUNT(*) as total_registros FROM users;

-- Email settings
SELECT 'email_settings' as tabela, COUNT(*) as total_registros FROM email_settings;

-- Email templates
SELECT 'email_templates' as tabela, COUNT(*) as total_registros FROM email_templates;

-- System 2FA settings
SELECT 'system_2fa_settings' as tabela, COUNT(*) as total_registros FROM system_2fa_settings;

-- ============================================
-- VERIFICAR STATUS DA IMPLEMENTAÇÃO 2FA
-- ============================================

-- 1. Verificar estrutura da tabela users
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('two_fa_enabled', 'two_fa_secret', 'ultimo_login')
ORDER BY column_name;

-- 2. Verificar se tabelas 2FA existem
SELECT 
    table_name,
    'EXISTE' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('system_2fa_settings', 'email_settings', 'email_templates')
ORDER BY table_name;

-- 3. Verificar configurações de email
SELECT 
    smtp_host,
    smtp_port,
    smtp_username,
    from_email,
    is_active,
    environment
FROM email_settings
WHERE is_active = true;

-- 4. Verificar templates de email 2FA
SELECT 
    template_key,
    subject,
    is_active,
    created_at
FROM email_templates 
WHERE template_key = '2fa-code'
ORDER BY template_key;

-- 5. Verificar configurações 2FA do sistema
SELECT 
    setting_key,
    setting_value,
    description,
    is_active
FROM system_2fa_settings
ORDER BY setting_key;

-- 6. Resumo do que está faltando
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_fa_enabled') 
        THEN '✅ Campo two_fa_enabled EXISTE'
        ELSE '❌ Campo two_fa_enabled FALTANDO'
    END as status_two_fa_enabled,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_fa_secret') 
        THEN '✅ Campo two_fa_secret EXISTE'
        ELSE '❌ Campo two_fa_secret FALTANDO'
    END as status_two_fa_secret,
    
    CASE 
        WHEN EXISTS (SELECT 1 FROM email_templates WHERE template_key = '2fa-code') 
        THEN '✅ Template 2fa-code EXISTE'
        ELSE '❌ Template 2fa-code FALTANDO'
    END as status_template_2fa;

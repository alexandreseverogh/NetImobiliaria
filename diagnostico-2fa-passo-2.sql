-- ============================================
-- DIAGNÓSTICO 2FA - PASSO 2
-- ============================================

-- PASSO 2: Verificar existência das tabelas
SELECT 
    'PASSO 2 - EXISTÊNCIA DAS TABELAS' as verificacao;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_settings' AND table_schema = 'public') 
        THEN '✅ Tabela email_settings EXISTE'
        ELSE '❌ Tabela email_settings FALTANDO'
    END as status_email_settings;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_templates' AND table_schema = 'public') 
        THEN '✅ Tabela email_templates EXISTE'
        ELSE '❌ Tabela email_templates FALTANDO'
    END as status_email_templates;

SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_2fa_settings' AND table_schema = 'public') 
        THEN '✅ Tabela system_2fa_settings EXISTE'
        ELSE '❌ Tabela system_2fa_settings FALTANDO'
    END as status_system_2fa_settings;



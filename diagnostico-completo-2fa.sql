-- Diagnóstico completo do sistema 2FA
-- Execute no pgAdmin4

-- 1. Verificar se o template existe
SELECT 'TEMPLATE 2FA-CODE:' as verificacao, name, subject, is_active, created_at 
FROM email_templates WHERE name = '2fa-code';

-- 2. Ver todos os templates
SELECT 'TODOS OS TEMPLATES:' as verificacao, name, is_active FROM email_templates ORDER BY name;

-- 3. Verificar configurações SMTP
SELECT 'CONFIGURAÇÕES SMTP:' as verificacao, 
       smtp_host, smtp_port, smtp_secure, 
       smtp_username, 
       CASE WHEN smtp_password IS NOT NULL AND LENGTH(smtp_password) > 0 
            THEN '***PREENCHIDO***' 
            ELSE 'VAZIO' 
       END as password_status,
       is_active 
FROM email_settings;

-- 4. Verificar tabelas 2FA
SELECT 'TABELAS 2FA:' as verificacao, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_2fa_codes') 
            THEN 'user_2fa_codes: EXISTE' 
            ELSE 'user_2fa_codes: NÃO EXISTE' 
       END as tabela_codes,
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_2fa_logs') 
            THEN 'audit_2fa_logs: EXISTE' 
            ELSE 'audit_2fa_logs: NÃO EXISTE' 
       END as tabela_logs;
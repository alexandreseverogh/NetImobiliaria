-- Corrigir configuração SSL final para Gmail
-- Execute no pgAdmin4

-- Verificar configuração atual
SELECT id, smtp_host, smtp_port, smtp_secure, smtp_username, is_active 
FROM email_settings;

-- Corrigir SSL para Gmail (smtp_secure = false para STARTTLS na porta 587)
UPDATE email_settings SET
    smtp_secure = false,
    smtp_port = 587
WHERE smtp_host = 'smtp.gmail.com';

-- Verificar se foi corrigido
SELECT id, smtp_host, smtp_port, smtp_secure, smtp_username, is_active 
FROM email_settings;

-- Verificar se o template 2fa-code existe
SELECT name, subject, is_active FROM email_templates WHERE name = '2fa-code';

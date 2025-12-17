-- Corrigir configuração SMTP para Gmail
-- Execute no pgAdmin4

-- Verificar configuração atual
SELECT id, smtp_host, smtp_port, smtp_secure, smtp_username, is_active 
FROM email_settings;

-- Corrigir smtp_secure para Gmail (porta 587 usa STARTTLS)
UPDATE email_settings SET
    smtp_secure = true,
    smtp_port = 587
WHERE smtp_host = 'smtp.gmail.com';

-- Verificar se foi corrigido
SELECT id, smtp_host, smtp_port, smtp_secure, smtp_username, is_active 
FROM email_settings;



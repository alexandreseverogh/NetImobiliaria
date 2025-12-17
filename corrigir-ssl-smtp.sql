-- Corrigir configuração SSL para Gmail
-- Execute no pgAdmin4

-- Verificar configuração atual
SELECT id, smtp_host, smtp_port, smtp_secure, smtp_username, is_active 
FROM email_settings;

-- Corrigir configuração SSL para Gmail
-- smtp_secure = false para porta 587 com STARTTLS
UPDATE email_settings SET
    smtp_secure = false,
    smtp_port = 587,
    smtp_host = 'smtp.gmail.com'
WHERE smtp_host = 'smtp.gmail.com';

-- Verificar se foi corrigido
SELECT id, smtp_host, smtp_port, smtp_secure, smtp_username, is_active 
FROM email_settings;



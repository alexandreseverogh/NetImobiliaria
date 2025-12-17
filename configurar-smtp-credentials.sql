-- Script para configurar credenciais SMTP
-- Execute no pgAdmin4

-- Verificar configurações atuais
SELECT * FROM email_settings;

-- Atualizar credenciais SMTP (substitua pelos seus dados reais)
UPDATE email_settings SET
    smtp_username = 'seu_email@gmail.com',
    smtp_password = 'sua_senha_app',
    is_active = true
WHERE id = (SELECT id FROM email_settings LIMIT 1);

-- Verificar se foi atualizado
SELECT id, smtp_host, smtp_port, smtp_username, smtp_secure, is_active 
FROM email_settings;



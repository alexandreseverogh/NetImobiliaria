-- Corrigir template e SMTP definitivamente
-- Execute no pgAdmin4

-- 1. Deletar template existente se houver
DELETE FROM email_templates WHERE name = '2fa-code';

-- 2. Criar template 2fa-code novamente
INSERT INTO email_templates (name, subject, html_content, variables, is_active, created_at)
VALUES (
    '2fa-code',
    'Código de Verificação - Net Imobiliária',
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Código de Verificação</title></head><body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;"><div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;"><div style="text-align: center; margin-bottom: 30px;"><h1 style="color: #2563eb;">🏠 Net Imobiliária</h1><h2>Código de Verificação</h2></div><p>Olá!</p><p>Você solicitou um código de verificação para acessar sua conta.</p><div style="background-color: #f3f4f6; border: 2px solid #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;"><p style="margin: 0; color: #6b7280;">Seu código de verificação é:</p><div style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 5px; margin-top: 10px;">{{code}}</div></div><div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 5px; padding: 15px; margin: 20px 0; color: #92400e;"><strong>⚠️ Importante:</strong><ul style="margin: 10px 0; padding-left: 20px;"><li>Este código expira em <strong>{{expiration_minutes}} minutos</strong></li><li>Não compartilhe este código com ninguém</li></ul></div><p>Se você não solicitou este código, ignore este email.</p><div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;"><p>© 2024 Net Imobiliária</p></div></div></body></html>',
    '["code", "expiration_minutes"]',
    true,
    NOW()
);

-- 3. Verificar template criado
SELECT 'TEMPLATE CRIADO:' as status, name, subject, is_active FROM email_templates WHERE name = '2fa-code';

-- 4. Atualizar configurações SMTP (substitua pelas suas credenciais reais)
UPDATE email_settings SET
    smtp_secure = false,
    smtp_port = 587,
    smtp_username = 'alexandreseverog@gmail.com',
    smtp_password = 'ewaz aohi aznk megn',
    is_active = true
WHERE smtp_host = 'smtp.gmail.com';

-- 5. Verificar configurações SMTP atualizadas
SELECT 'SMTP ATUALIZADO:' as status, smtp_host, smtp_port, smtp_secure, smtp_username, is_active FROM email_settings;

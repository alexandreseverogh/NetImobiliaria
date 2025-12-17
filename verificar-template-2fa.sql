-- Verificar template 2fa-code
-- Execute no pgAdmin4

-- Verificar se o template existe
SELECT name, subject, is_active, created_at FROM email_templates WHERE name = '2fa-code';

-- Ver todos os templates disponíveis
SELECT name, subject, is_active FROM email_templates ORDER BY name;

-- Se não existir, criar o template
INSERT INTO email_templates (name, subject, html_content, variables, is_active, created_at)
SELECT '2fa-code', 'Código de Verificação - Net Imobiliária', 
'<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Código de Verificação</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
        <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb;">🏠 Net Imobiliária</h1>
            <h2>Código de Verificação</h2>
        </div>
        
        <p>Olá!</p>
        <p>Você solicitou um código de verificação para acessar sua conta.</p>
        
        <div style="background-color: #f3f4f6; border: 2px solid #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; color: #6b7280;">Seu código de verificação é:</p>
            <div style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 5px; margin-top: 10px;">{{code}}</div>
        </div>
        
        <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 5px; padding: 15px; margin: 20px 0; color: #92400e;">
            <strong>⚠️ Importante:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Este código expira em <strong>{{expiration_minutes}} minutos</strong></li>
                <li>Não compartilhe este código com ninguém</li>
            </ul>
        </div>
        
        <p>Se você não solicitou este código, ignore este email.</p>
        
        <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
            <p>© 2024 Net Imobiliária</p>
        </div>
    </div>
</body>
</html>',
'["code", "expiration_minutes"]', true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM email_templates WHERE name = '2fa-code');

-- Verificar novamente
SELECT name, subject, is_active FROM email_templates WHERE name = '2fa-code';

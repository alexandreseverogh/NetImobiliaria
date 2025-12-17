-- Criar template 2FA com estrutura correta
-- Execute no pgAdmin4

-- Verificar se o template já existe
SELECT * FROM email_templates WHERE name = '2fa-code';

-- Criar template 2fa-code (ajuste os nomes das colunas conforme a estrutura real)
INSERT INTO email_templates (name, subject, html_content, variables, is_active, created_at)
VALUES (
    '2fa-code',
    'Código de Verificação - Net Imobiliária',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Código de Verificação</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { color: #2563eb; font-size: 24px; font-weight: bold; }
        .code { background-color: #f3f4f6; border: 2px solid #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .code-number { font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 5px; }
        .warning { background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 5px; padding: 15px; margin: 20px 0; color: #92400e; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏠 Net Imobiliária</div>
            <h1>Código de Verificação</h1>
        </div>
        
        <p>Olá!</p>
        <p>Você solicitou um código de verificação para acessar sua conta no sistema Net Imobiliária.</p>
        
        <div class="code">
            <p style="margin: 0; color: #6b7280;">Seu código de verificação é:</p>
            <div class="code-number">{{code}}</div>
        </div>
        
        <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Este código expira em <strong>{{expiration_minutes}} minutos</strong></li>
                <li>Não compartilhe este código com ninguém</li>
                <li>Se você não solicitou este código, ignore este email</li>
            </ul>
        </div>
        
        <p>Se você não conseguiu fazer login, pode ser necessário verificar suas credenciais ou entrar em contato com o suporte.</p>
        
        <div class="footer">
            <p>Este é um email automático, não responda a esta mensagem.</p>
            <p>© 2024 Net Imobiliária - Sistema Administrativo</p>
        </div>
    </div>
</body>
</html>',
    '["code", "expiration_minutes"]',
    true,
    NOW()
) ON CONFLICT (name) DO NOTHING;

-- Verificar se foi criado
SELECT name, subject, is_active FROM email_templates WHERE name = '2fa-code';



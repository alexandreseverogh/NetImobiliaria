-- ============================================
-- COMPLETAR IMPLEMENTAÇÃO DO 2FA
-- ============================================

-- 1. Adicionar campos 2FA na tabela users (se não existirem)
DO $$
BEGIN
    -- Campo two_fa_enabled
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'two_fa_enabled'
    ) THEN
        ALTER TABLE users ADD COLUMN two_fa_enabled BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Campo two_fa_enabled adicionado à tabela users';
    ELSE
        RAISE NOTICE 'Campo two_fa_enabled já existe na tabela users';
    END IF;

    -- Campo two_fa_secret
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'two_fa_secret'
    ) THEN
        ALTER TABLE users ADD COLUMN two_fa_secret VARCHAR(255);
        RAISE NOTICE 'Campo two_fa_secret adicionado à tabela users';
    ELSE
        RAISE NOTICE 'Campo two_fa_secret já existe na tabela users';
    END IF;

    -- Campo ultimo_login (se ainda não foi criado)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'ultimo_login'
    ) THEN
        ALTER TABLE users ADD COLUMN ultimo_login TIMESTAMP;
        RAISE NOTICE 'Campo ultimo_login adicionado à tabela users';
    ELSE
        RAISE NOTICE 'Campo ultimo_login já existe na tabela users';
    END IF;
END $$;

-- 2. Criar template de email 2FA (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM email_templates WHERE template_key = '2fa-code'
    ) THEN
        INSERT INTO email_templates (
            template_key, 
            subject, 
            html_content, 
            text_content,
            is_active,
            created_at,
            updated_at
        ) VALUES (
            '2fa-code',
            'Código de Verificação - Net Imobiliária',
            '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código de Verificação</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { padding: 30px; }
        .code { background: #f8f9fa; border: 2px dashed #dee2e6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; color: #495057; margin: 20px 0; border-radius: 8px; letter-spacing: 5px; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 14px; color: #6c757d; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Código de Verificação</h1>
            <p>Net Imobiliária - Sistema Seguro</p>
        </div>
        
        <div class="content">
            <h2>Olá!</h2>
            <p>Você solicitou acesso ao sistema Net Imobiliária. Use o código abaixo para completar sua verificação:</p>
            
            <div class="code">{{CODE}}</div>
            
            <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                    <li>Este código é válido por <strong>10 minutos</strong></li>
                    <li>Use-o apenas uma vez</li>
                    <li>Não compartilhe este código com ninguém</li>
                    <li>Se você não solicitou este código, ignore este email</li>
                </ul>
            </div>
            
            <p>Se você não conseguir usar este código, solicite um novo código de verificação.</p>
        </div>
        
        <div class="footer">
            <p><strong>Net Imobiliária</strong><br>
            Sistema de Gestão Imobiliária<br>
            Este é um email automático, não responda.</p>
        </div>
    </div>
</body>
</html>',
            'CÓDIGO DE VERIFICAÇÃO - Net Imobiliária

Olá!

Você solicitou acesso ao sistema Net Imobiliária. Use o código abaixo para completar sua verificação:

CÓDIGO: {{CODE}}

⚠️ IMPORTANTE:
- Este código é válido por 10 minutos
- Use-o apenas uma vez
- Não compartilhe este código com ninguém
- Se você não solicitou este código, ignore este email

Se você não conseguir usar este código, solicite um novo código de verificação.

---
Net Imobiliária - Sistema de Gestão Imobiliária
Este é um email automático, não responda.',
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Template 2fa-code criado com sucesso';
    ELSE
        RAISE NOTICE 'Template 2fa-code já existe';
    END IF;
END $$;

-- 3. Verificar estrutura final da tabela users
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- 4. Verificar se template foi criado
SELECT 
    template_key,
    subject,
    is_active,
    LENGTH(html_content) as html_size,
    LENGTH(text_content) as text_size,
    created_at
FROM email_templates 
WHERE template_key = '2fa-code';

-- 5. Resumo final
SELECT 
    'IMPLEMENTAÇÃO 2FA COMPLETA!' as status,
    NOW() as completed_at;



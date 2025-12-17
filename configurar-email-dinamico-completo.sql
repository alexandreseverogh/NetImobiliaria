-- =====================================================
-- SCRIPT PARA MIGRAR DE HARDCODED PARA SISTEMA DINÂMICO
-- =====================================================
-- Este script configura email_settings e email_templates
-- para que o sistema dinâmico funcione corretamente

-- 1. VERIFICAR E ATUALIZAR email_settings
SELECT '=== VERIFICANDO email_settings ===' as status;
SELECT * FROM email_settings;

-- Atualizar configurações SMTP (SUBSTITUA com suas credenciais reais)
UPDATE email_settings 
SET 
  smtp_host = 'smtp.gmail.com',
  smtp_port = 587,
  smtp_secure = false,  -- false para STARTTLS na porta 587
  smtp_username = 'alexandreseverog@gmail.com',  -- SUBSTITUA com seu email
  smtp_password = 'ewaz aohi aznk megn',  -- SUBSTITUA com sua senha de app
  from_email = 'alexandreseverog@gmail.com',  -- SUBSTITUA com seu email
  from_name = 'Net Imobiliária',
  is_active = true,
  updated_at = NOW()
WHERE id = (SELECT id FROM email_settings LIMIT 1);

-- Se não existir registro, criar um
INSERT INTO email_settings (
  smtp_host,
  smtp_port,
  smtp_secure,
  smtp_username,
  smtp_password,
  from_email,
  from_name,
  is_active
)
SELECT 
  'smtp.gmail.com',
  587,
  false,
  'alexandreseverog@gmail.com',
  'ewaz aohi aznk megn',
  'alexandreseverog@gmail.com',
  'Net Imobiliária',
  true
WHERE NOT EXISTS (SELECT 1 FROM email_settings);

SELECT '=== email_settings CONFIGURADO ===' as status;
SELECT * FROM email_settings;

-- 2. VERIFICAR E CRIAR/ATUALIZAR template 2fa-code
SELECT '=== VERIFICANDO email_templates ===' as status;
SELECT name, subject, is_active FROM email_templates WHERE name = '2fa-code';

-- Deletar template existente se houver
DELETE FROM email_templates WHERE name = '2fa-code';

-- Criar template 2fa-code
INSERT INTO email_templates (
  name,
  subject,
  html_content,
  variables,
  is_active,
  created_at,
  updated_at
)
VALUES (
  '2fa-code',
  'Código de Verificação - Net Imobiliária',
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
        <li>Este código expira em <strong>10 minutos</strong></li>
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
  '["code"]',
  true,
  NOW(),
  NOW()
);

SELECT '=== TEMPLATE 2fa-code CRIADO ===' as status;
SELECT name, subject, is_active, created_at FROM email_templates WHERE name = '2fa-code';

-- 3. VERIFICAR RESULTADO FINAL
SELECT '=== CONFIGURAÇÃO COMPLETA ===' as status;

SELECT 
  '✅ SMTP Configurado' as item,
  smtp_host as valor,
  CASE WHEN smtp_username IS NOT NULL THEN '✅' ELSE '❌' END as credenciais
FROM email_settings
LIMIT 1;

SELECT 
  '✅ Template 2FA' as item,
  name as template_name,
  CASE WHEN is_active THEN '✅ Ativo' ELSE '❌ Inativo' END as status
FROM email_templates 
WHERE name = '2fa-code';

SELECT '
╔════════════════════════════════════════════════════════════════╗
║                  MIGRAÇÃO PARA SISTEMA DINÂMICO                ║
║                        CONCLUÍDA COM SUCESSO!                  ║
╚════════════════════════════════════════════════════════════════╝

📧 PRÓXIMOS PASSOS:

1. ✅ Backup criado:
   - emailServiceSimple.BACKUP.ts
   - twoFactorAuthService.BACKUP.ts

2. 🔄 Modificar código:
   - Atualizar twoFactorAuthService.ts para usar emailService
   - Corrigir inicialização do emailService

3. 🧪 Testar:
   - Reiniciar servidor
   - Testar login com 2FA
   - Verificar envio de email

⚠️  IMPORTANTE: 
   - Substitua as credenciais SMTP pelas suas reais antes de usar
   - Use senha de app do Gmail, não a senha normal
' as instrucoes;




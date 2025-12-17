-- Inserir templates de email para 2FA
INSERT INTO email_templates (name, subject, html_content, text_content, variables, is_active, created_at, updated_at)
VALUES 
(
  '2fa_verification',
  'Código de Verificação - Net Imobiliária',
  '
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Código de Verificação</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f4f4f4;
      }
      .container {
        background-color: #ffffff;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #007bff;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .logo {
        font-size: 24px;
        font-weight: bold;
        color: #007bff;
        margin-bottom: 10px;
      }
      .code-container {
        background-color: #f8f9fa;
        border: 2px dashed #007bff;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        margin: 20px 0;
      }
      .verification-code {
        font-size: 32px;
        font-weight: bold;
        color: #007bff;
        letter-spacing: 5px;
        font-family: monospace;
      }
      .warning {
        background-color: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 5px;
        padding: 15px;
        margin: 20px 0;
        color: #856404;
      }
      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        font-size: 12px;
        color: #666;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">Net Imobiliária</div>
        <h1>Código de Verificação</h1>
      </div>
      
      <p>Olá,</p>
      
      <p>Você solicitou um código de verificação para acessar sua conta no sistema Net Imobiliária.</p>
      
      <div class="code-container">
        <p style="margin: 0 0 10px 0; font-weight: bold;">Seu código de verificação é:</p>
        <div class="verification-code">{{code}}</div>
      </div>
      
      <div class="warning">
        <strong>⚠️ Importante:</strong>
        <ul>
          <li>Este código expira em {{expiration_minutes}} minutos</li>
          <li>Use este código apenas uma vez</li>
          <li>Não compartilhe este código com ninguém</li>
        </ul>
      </div>
      
      <p>Se você não solicitou este código, ignore este email ou entre em contato conosco.</p>
      
      <div class="footer">
        <p>Este é um email automático, não responda.</p>
        <p>© 2024 Net Imobiliária. Todos os direitos reservados.</p>
      </div>
    </div>
  </body>
  </html>
  ',
  '
  Net Imobiliária - Código de Verificação
  
  Olá,
  
  Você solicitou um código de verificação para acessar sua conta no sistema Net Imobiliária.
  
  Seu código de verificação é: {{code}}
  
  IMPORTANTE:
  - Este código expira em {{expiration_minutes}} minutos
  - Use este código apenas uma vez
  - Não compartilhe este código com ninguém
  
  Se você não solicitou este código, ignore este email ou entre em contato conosco.
  
  Este é um email automático, não responda.
  © 2024 Net Imobiliária. Todos os direitos reservados.
  ',
  ARRAY['code', 'expiration_minutes'],
  true,
  NOW(),
  NOW()
),
(
  'password_reset',
  'Redefinição de Senha - Net Imobiliária',
  '
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redefinição de Senha</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        color: #333;
        max-width: 600px;
        margin: 0 auto;
        padding: 20px;
        background-color: #f4f4f4;
      }
      .container {
        background-color: #ffffff;
        padding: 30px;
        border-radius: 10px;
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
      }
      .header {
        text-align: center;
        border-bottom: 2px solid #dc3545;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      .logo {
        font-size: 24px;
        font-weight: bold;
        color: #dc3545;
        margin-bottom: 10px;
      }
      .button {
        display: inline-block;
        background-color: #dc3545;
        color: white;
        padding: 12px 30px;
        text-decoration: none;
        border-radius: 5px;
        margin: 20px 0;
      }
      .warning {
        background-color: #f8d7da;
        border: 1px solid #f5c6cb;
        border-radius: 5px;
        padding: 15px;
        margin: 20px 0;
        color: #721c24;
      }
      .footer {
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px solid #eee;
        font-size: 12px;
        color: #666;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">Net Imobiliária</div>
        <h1>Redefinição de Senha</h1>
      </div>
      
      <p>Olá,</p>
      
      <p>Você solicitou a redefinição da senha da sua conta no sistema Net Imobiliária.</p>
      
      <p>Clique no botão abaixo para redefinir sua senha:</p>
      
      <div style="text-align: center;">
        <a href="{{reset_link}}" class="button">Redefinir Senha</a>
      </div>
      
      <div class="warning">
        <strong>⚠️ Importante:</strong>
        <ul>
          <li>Este link expira em {{expiration_hours}} horas</li>
          <li>Use este link apenas uma vez</li>
          <li>Se você não solicitou esta redefinição, ignore este email</li>
        </ul>
      </div>
      
      <p>Se o botão não funcionar, copie e cole o link abaixo no seu navegador:</p>
      <p style="word-break: break-all; color: #007bff;">{{reset_link}}</p>
      
      <div class="footer">
        <p>Este é um email automático, não responda.</p>
        <p>© 2024 Net Imobiliária. Todos os direitos reservados.</p>
      </div>
    </div>
  </body>
  </html>
  ',
  '
  Net Imobiliária - Redefinição de Senha
  
  Olá,
  
  Você solicitou a redefinição da senha da sua conta no sistema Net Imobiliária.
  
  Para redefinir sua senha, acesse o link abaixo:
  {{reset_link}}
  
  IMPORTANTE:
  - Este link expira em {{expiration_hours}} horas
  - Use este link apenas uma vez
  - Se você não solicitou esta redefinição, ignore este email
  
  Este é um email automático, não responda.
  © 2024 Net Imobiliária. Todos os direitos reservados.
  ',
  ARRAY['reset_link', 'expiration_hours'],
  true,
  NOW(),
  NOW()
);

-- Atualizar contador de templates
UPDATE email_settings 
SET email_templates_count = (
  SELECT COUNT(*) FROM email_templates WHERE is_active = true
)
WHERE id = 1;



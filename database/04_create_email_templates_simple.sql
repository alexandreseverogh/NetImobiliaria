-- Inserir templates de email para 2FA
INSERT INTO email_templates (name, subject, html_content, text_content, variables, is_active, created_at, updated_at)
VALUES 
(
  '2fa_verification',
  'Codigo de Verificacao - Net Imobiliaria',
  '<html><body><h2>Net Imobiliaria</h2><h3>Codigo de Verificacao</h3><p>Ola,</p><p>Voce solicitou um codigo de verificacao para acessar sua conta no sistema Net Imobiliaria.</p><div style="background-color: #f8f9fa; border: 2px dashed #007bff; padding: 20px; text-align: center; margin: 20px 0;"><p><strong>Seu codigo de verificacao e:</strong></p><div style="font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; font-family: monospace;">{{code}}</div></div><div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; color: #856404;"><strong>Importante:</strong><ul><li>Este codigo expira em {{expiration_minutes}} minutos</li><li>Use este codigo apenas uma vez</li><li>Nao compartilhe este codigo com ninguem</li></ul></div><p>Se voce nao solicitou este codigo, ignore este email ou entre em contato conosco.</p><div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;"><p>Este e um email automatico, nao responda.</p><p>© 2024 Net Imobiliaria. Todos os direitos reservados.</p></div></body></html>',
  'Net Imobiliaria - Codigo de Verificacao\n\nOla,\n\nVoce solicitou um codigo de verificacao para acessar sua conta no sistema Net Imobiliaria.\n\nSeu codigo de verificacao e: {{code}}\n\nIMPORTANTE:\n- Este codigo expira em {{expiration_minutes}} minutos\n- Use este codigo apenas uma vez\n- Nao compartilhe este codigo com ninguem\n\nSe voce nao solicitou este codigo, ignore este email ou entre em contato conosco.\n\nEste e um email automatico, nao responda.\n© 2024 Net Imobiliaria. Todos os direitos reservados.',
  '["code", "expiration_minutes"]'::jsonb,
  true,
  NOW(),
  NOW()
),
(
  'password_reset',
  'Redefinicao de Senha - Net Imobiliaria',
  '<html><body><h2>Net Imobiliaria</h2><h3>Redefinicao de Senha</h3><p>Ola,</p><p>Voce solicitou a redefinicao da senha da sua conta no sistema Net Imobiliaria.</p><p>Clique no botao abaixo para redefinir sua senha:</p><div style="text-align: center;"><a href="{{reset_link}}" style="display: inline-block; background-color: #dc3545; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Redefinir Senha</a></div><div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 15px; margin: 20px 0; color: #721c24;"><strong>Importante:</strong><ul><li>Este link expira em {{expiration_hours}} horas</li><li>Use este link apenas uma vez</li><li>Se voce nao solicitou esta redefinicao, ignore este email</li></ul></div><p>Se o botao nao funcionar, copie e cole o link abaixo no seu navegador:</p><p style="word-break: break-all; color: #007bff;">{{reset_link}}</p><div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;"><p>Este e um email automatico, nao responda.</p><p>© 2024 Net Imobiliaria. Todos os direitos reservados.</p></div></body></html>',
  'Net Imobiliaria - Redefinicao de Senha\n\nOla,\n\nVoce solicitou a redefinicao da senha da sua conta no sistema Net Imobiliaria.\n\nPara redefinir sua senha, acesse o link abaixo:\n{{reset_link}}\n\nIMPORTANTE:\n- Este link expira em {{expiration_hours}} horas\n- Use este link apenas uma vez\n- Se voce nao solicitou esta redefinicao, ignore este email\n\nEste e um email automatico, nao responda.\n© 2024 Net Imobiliaria. Todos os direitos reservados.',
  '["reset_link", "expiration_hours"]'::jsonb,
  true,
  NOW(),
  NOW()
);

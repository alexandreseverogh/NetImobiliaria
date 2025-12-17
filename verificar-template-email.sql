-- Verificar se o template de email 2FA existe
SELECT 
  id,
  name,
  subject,
  content,
  created_at
FROM email_templates 
WHERE name = '2fa-code'
ORDER BY created_at DESC;



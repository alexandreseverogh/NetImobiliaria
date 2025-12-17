-- Verificar configuração do SMTP
SELECT 
  id,
  setting_key,
  setting_value,
  description,
  created_at
FROM email_settings 
ORDER BY setting_key;



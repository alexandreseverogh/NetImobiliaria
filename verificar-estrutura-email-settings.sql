-- Verificar estrutura real da tabela email_settings
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'email_settings' 
ORDER BY ordinal_position;

-- Verificar dados atuais
SELECT 
  smtp_host,
  smtp_port,
  smtp_secure,
  smtp_username,
  smtp_password,
  from_email,
  from_name,
  is_active
FROM email_settings 
LIMIT 1;



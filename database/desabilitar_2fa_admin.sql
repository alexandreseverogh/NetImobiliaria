-- DESABILITAR 2FA PARA O USUÁRIO ADMIN
-- Execute este script no pgAdmin4

-- 1. Desabilitar 2FA na tabela user_2fa_config
UPDATE user_2fa_config 
SET is_enabled = false, updated_at = NOW()
WHERE user_id = (SELECT id FROM users WHERE username = 'admin' OR email = 'admin@123')
  AND method = 'email';

-- 2. Desabilitar 2FA na tabela users
UPDATE users 
SET two_fa_enabled = false
WHERE username = 'admin' OR email = 'admin@123';

-- 3. Invalidar todos os códigos pendentes de 2FA
UPDATE user_2fa_codes 
SET used = true
WHERE user_id = (SELECT id FROM users WHERE username = 'admin' OR email = 'admin@123')
  AND used = false;

-- 4. Verificar se foi desabilitado corretamente
SELECT 
    u.id,
    u.username,
    u.email,
    u.two_fa_enabled as two_fa_enabled_in_users,
    ufc.is_enabled as two_fa_enabled_in_config,
    ufc.method,
    ufc.updated_at as config_updated_at
FROM users u
LEFT JOIN user_2fa_config ufc ON u.id = ufc.user_id AND ufc.method = 'email'
WHERE u.username = 'admin' OR u.email = 'admin@123';

-- Resultado esperado:
-- two_fa_enabled_in_users = false
-- two_fa_enabled_in_config = false


-- Verificar status 2FA do usuário MariaSilva
-- Execute no pgAdmin4

-- 1. Verificar dados do usuário MariaSilva
SELECT 
    id,
    username,
    email,
    two_fa_enabled,
    two_fa_secret,
    is_active,
    created_at
FROM users 
WHERE username = 'MariaSilva';

-- 2. Verificar qual perfil ela tem
SELECT 
    u.username,
    ur.name as perfil,
    ur.two_fa_required,
    ura.is_primary
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'MariaSilva';

-- 3. Atualizar two_fa_enabled para true se o perfil requer
UPDATE users 
SET two_fa_enabled = true
WHERE username = 'MariaSilva' 
AND two_fa_enabled IS NULL;

-- 4. Verificar se foi atualizado
SELECT 
    username,
    two_fa_enabled,
    two_fa_secret
FROM users 
WHERE username = 'MariaSilva';



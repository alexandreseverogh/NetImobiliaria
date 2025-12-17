-- Verificar usuários com 2FA habilitado
SELECT 
    u.id,
    u.username,
    u.email,
    u.two_fa_enabled,
    ur.name as role_name,
    ur.two_fa_required
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.two_fa_enabled = true
ORDER BY u.username;



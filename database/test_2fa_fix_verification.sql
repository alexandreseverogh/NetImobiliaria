-- ============================================================
-- TESTE DA CORREÇÃO CRÍTICA DE 2FA
-- ============================================================
-- OBJETIVO: Verificar se a função is2FAEnabled agora funciona
-- corretamente após remover a condição inexistente ura.is_active
-- ============================================================

-- ============================================================
-- 1. SIMULAR A QUERY CORRIGIDA DA FUNÇÃO is2FAEnabled
-- ============================================================

-- Para usuário Nunes (deve retornar true - perfil requer 2FA)
SELECT 
    u.username,
    ur.requires_2fa as role_requires_2fa,
    u.two_fa_enabled as user_2fa_enabled,
    CASE 
        WHEN ur.requires_2fa = true THEN true  -- Perfil requer 2FA = sempre true
        WHEN u.two_fa_enabled = true THEN true -- Usuário habilitou manualmente
        ELSE false
    END as should_require_2fa,
    CASE 
        WHEN ur.requires_2fa = true AND u.two_fa_enabled = false THEN '🔐 LOGIN DEVE SOLICITAR 2FA (perfil requer)'
        WHEN ur.requires_2fa = true AND u.two_fa_enabled = true THEN '✅ LOGIN COM 2FA CONFIGURADO'
        WHEN ur.requires_2fa = false AND u.two_fa_enabled = true THEN '✅ LOGIN COM 2FA MANUAL'
        ELSE '✅ LOGIN SEM 2FA'
    END as expected_login_behavior
FROM users u 
JOIN user_role_assignments ura ON u.id = ura.user_id 
JOIN user_roles ur ON ura.role_id = ur.id 
WHERE u.username = 'Nunes';

-- Para usuário Soraia (deve retornar true - habilitou manualmente)
SELECT 
    u.username,
    ur.requires_2fa as role_requires_2fa,
    u.two_fa_enabled as user_2fa_enabled,
    CASE 
        WHEN ur.requires_2fa = true THEN true  -- Perfil requer 2FA = sempre true
        WHEN u.two_fa_enabled = true THEN true -- Usuário habilitou manualmente
        ELSE false
    END as should_require_2fa,
    CASE 
        WHEN ur.requires_2fa = true AND u.two_fa_enabled = false THEN '🔐 LOGIN DEVE SOLICITAR 2FA (perfil requer)'
        WHEN ur.requires_2fa = true AND u.two_fa_enabled = true THEN '✅ LOGIN COM 2FA CONFIGURADO'
        WHEN ur.requires_2fa = false AND u.two_fa_enabled = true THEN '✅ LOGIN COM 2FA MANUAL'
        ELSE '✅ LOGIN SEM 2FA'
    END as expected_login_behavior
FROM users u 
JOIN user_role_assignments ura ON u.id = ura.user_id 
JOIN user_roles ur ON ura.role_id = ur.id 
WHERE u.username = 'Soraia';

-- ============================================================
-- 2. VERIFICAR SE A QUERY FUNCIONA SEM ERRO
-- ============================================================

SELECT 
    COUNT(*) as total_users_tested,
    COUNT(CASE WHEN ur.requires_2fa = true THEN 1 END) as users_with_role_2fa,
    COUNT(CASE WHEN u.two_fa_enabled = true THEN 1 END) as users_with_manual_2fa
FROM users u 
JOIN user_role_assignments ura ON u.id = ura.user_id 
JOIN user_roles ur ON ura.role_id = ur.id 
WHERE u.username IN ('Nunes', 'Soraia');

-- ============================================================
-- 3. PRÓXIMOS PASSOS
-- ============================================================
-- 1. Testar login do usuário "Nunes" - deve solicitar 2FA
-- 2. Testar login do usuário "Soraia" - deve solicitar 2FA
-- 3. Verificar se emails são enviados corretamente
-- ============================================================

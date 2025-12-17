-- ============================================================
-- TESTE DA CORREÇÃO DE SEGURANÇA 2FA
-- ============================================================
-- OBJETIVO: Verificar se usuários com perfis que requerem 2FA
-- são forçados a configurar 2FA no próximo login
-- ============================================================

-- ============================================================
-- 1. VERIFICAR STATUS ATUAL DO USUÁRIO "NUNES"
-- ============================================================

SELECT 
    u.username,
    ur.name as role_name,
    ur.requires_2fa as role_requires_2fa,
    u.two_fa_enabled as user_2fa_enabled,
    CASE 
        WHEN ur.requires_2fa = true AND u.two_fa_enabled = false THEN '⚠️ PROBLEMA: Perfil requer 2FA mas usuário não configurou'
        WHEN ur.requires_2fa = true AND u.two_fa_enabled = true THEN '✅ OK: Perfil requer 2FA e usuário configurou'
        WHEN ur.requires_2fa = false AND u.two_fa_enabled = true THEN '✅ OK: Usuário habilitou 2FA manualmente'
        WHEN ur.requires_2fa = false AND u.two_fa_enabled = false THEN '✅ OK: 2FA não requerido'
        ELSE '❓ Status desconhecido'
    END as status_2fa
FROM users u 
JOIN user_role_assignments ura ON u.id = ura.user_id 
JOIN user_roles ur ON ura.role_id = ur.id 
WHERE u.username = 'Nunes';

-- ============================================================
-- 2. SIMULAR VERIFICAÇÃO DA FUNÇÃO is2FAEnabled
-- ============================================================
-- Esta query simula o que a função corrigida deve retornar

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
        WHEN ur.requires_2fa = true AND u.two_fa_enabled = false THEN '🔐 LOGIN DEVE SOLICITAR 2FA'
        WHEN ur.requires_2fa = true AND u.two_fa_enabled = true THEN '✅ LOGIN COM 2FA CONFIGURADO'
        WHEN ur.requires_2fa = false AND u.two_fa_enabled = true THEN '✅ LOGIN COM 2FA MANUAL'
        ELSE '✅ LOGIN SEM 2FA'
    END as expected_login_behavior
FROM users u 
JOIN user_role_assignments ura ON u.id = ura.user_id 
JOIN user_roles ur ON ura.role_id = ur.id 
WHERE u.username = 'Nunes';

-- ============================================================
-- 3. VERIFICAR TODOS OS USUÁRIOS COM PERFIS QUE REQUEREM 2FA
-- ============================================================

SELECT 
    u.username,
    ur.name as role_name,
    ur.requires_2fa,
    u.two_fa_enabled,
    CASE 
        WHEN ur.requires_2fa = true AND u.two_fa_enabled = false THEN '🚨 VULNERABILIDADE'
        WHEN ur.requires_2fa = true AND u.two_fa_enabled = true THEN '✅ SEGURO'
        ELSE 'ℹ️ NORMAL'
    END as security_status
FROM users u 
JOIN user_role_assignments ura ON u.id = ura.user_id 
JOIN user_roles ur ON ura.role_id = ur.id 
WHERE ur.requires_2fa = true
ORDER BY security_status DESC, u.username;

-- ============================================================
-- 4. PRÓXIMOS PASSOS APÓS CORREÇÃO
-- ============================================================
-- 1. Testar login do usuário "Nunes" - deve solicitar 2FA
-- 2. Verificar se email de 2FA é enviado
-- 3. Configurar 2FA para o usuário
-- 4. Testar login completo com 2FA
-- ============================================================

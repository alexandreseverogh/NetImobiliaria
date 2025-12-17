-- ============================================
-- VERIFICAR SE CORREÇÃO DE PERMISSÕES FUNCIONOU
-- ============================================

-- 1. Verificar permissões atuais do admin para usuários
SELECT 
    'PERMISSÕES ATUAIS DO ADMIN PARA USUÁRIOS' as verificacao;

SELECT 
    sf.category,
    p.action,
    p.description,
    rp.granted_at
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
  AND sf.category = 'usuarios'
ORDER BY p.action;

-- 2. Verificar se tem permissão WRITE (create/update)
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM users u
            JOIN user_role_assignments ura ON u.id = ura.user_id
            JOIN role_permissions rp ON ura.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            JOIN system_features sf ON p.feature_id = sf.id
            WHERE u.username = 'admin'
              AND sf.category = 'usuarios'
              AND (p.action = 'create' OR p.action = 'update')
        ) THEN '✅ Admin TEM permissão WRITE para usuários'
        ELSE '❌ Admin AINDA NÃO TEM permissão WRITE para usuários'
    END as status_permissao_write;

-- 3. Contar total de permissões para usuários
SELECT 
    COUNT(*) as total_permissoes_usuarios
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
  AND sf.category = 'usuarios';

-- 4. Verificar se precisa fazer logout/login
SELECT 
    'INSTRUÇÕES' as tipo,
    '1. Faça LOGOUT do sistema' as passo_1,
    '2. Faça LOGIN novamente' as passo_2,
    '3. Teste editar usuário' as passo_3;

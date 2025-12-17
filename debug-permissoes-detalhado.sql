-- ============================================
-- DEBUG DETALHADO DAS PERMISSÕES
-- ============================================

-- 1. Verificar todas as permissões do admin para usuários
SELECT 
    'TODAS AS PERMISSÕES DO ADMIN PARA USUÁRIOS' as verificacao;

SELECT 
    sf.category,
    p.action,
    p.description,
    rp.granted_at,
    rp.granted_by
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
  AND sf.category = 'usuarios'
ORDER BY p.action;

-- 2. Verificar se permissões CREATE e UPDATE existem na tabela permissions
SELECT 
    'PERMISSÕES DISPONÍVEIS PARA USUÁRIOS' as verificacao;

SELECT 
    p.id,
    p.action,
    p.description
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.category = 'usuarios'
ORDER BY p.action;

-- 3. Verificar se o admin tem perfil atribuído
SELECT 
    'PERFIL DO ADMIN' as verificacao;

SELECT 
    u.username,
    ur.id as role_id,
    ur.name as role_name,
    ur.is_active as role_active
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin';

-- 4. Tentar adicionar permissões manualmente com IDs específicos
SELECT 
    'TENTANDO ADICIONAR PERMISSÕES MANUALMENTE' as verificacao;

-- Primeiro, vamos ver os IDs exatos
SELECT 
    ura.role_id,
    p.id as permission_id,
    p.action
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN permissions p ON p.feature_id = (SELECT id FROM system_features WHERE category = 'usuarios')
WHERE u.username = 'admin'
  AND p.action IN ('create', 'update');

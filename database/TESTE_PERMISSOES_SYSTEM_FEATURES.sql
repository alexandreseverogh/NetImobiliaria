-- ============================================================
-- TESTE DE PERMISSÕES PARA SYSTEM-FEATURES
-- ============================================================
-- Objetivo: Verificar se o mapeamento está funcionando corretamente
-- ============================================================

-- 1. Verificar permissões do usuário admin para "funcionalidades do sistema"
SELECT 
    u.username,
    sf.name as feature_name,
    p.action,
    CASE 
        WHEN p.action = 'READ' THEN 'READ'
        WHEN p.action = 'CREATE' OR p.action = 'UPDATE' OR p.action = 'WRITE' THEN 'WRITE'
        WHEN p.action = 'DELETE' THEN 'DELETE'
        WHEN p.action = 'ADMIN' THEN 'ADMIN'
        ELSE p.action
    END as mapped_action
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin' 
  AND sf.name = 'funcionalidades do sistema'
ORDER BY p.action;

-- 2. Verificar se o usuário tem permissão READ para system-features
-- (simulando o que a função userHasPermission faria)
SELECT 
    u.username,
    sf.name as feature_name,
    p.action,
    CASE 
        WHEN p.action = 'READ' THEN 1
        WHEN p.action = 'CREATE' OR p.action = 'UPDATE' OR p.action = 'WRITE' THEN 2
        WHEN p.action = 'DELETE' THEN 3
        WHEN p.action = 'ADMIN' THEN 4
        ELSE 0
    END as permission_level,
    CASE 
        WHEN p.action = 'READ' THEN 1
        WHEN p.action = 'CREATE' OR p.action = 'UPDATE' OR p.action = 'WRITE' THEN 2
        WHEN p.action = 'DELETE' THEN 3
        WHEN p.action = 'ADMIN' THEN 4
        ELSE 0
    END >= 1 as has_read_permission
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin' 
  AND sf.name = 'funcionalidades do sistema'
ORDER BY p.action;

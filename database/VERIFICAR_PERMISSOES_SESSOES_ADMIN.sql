-- ============================================================
-- VERIFICAÇÃO DE PERMISSÕES DE SESSÕES PARA ADMIN
-- ============================================================
-- Objetivo: Verificar se o usuário admin tem permissão EXECUTE para Sessões
-- ============================================================

-- 1. Verificar se admin tem permissão EXECUTE para Sessões
SELECT 
    u.username,
    sf.name as feature_name,
    p.action,
    p.description
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin' 
  AND sf.name = 'Sessões'
ORDER BY p.action;

-- 2. Verificar todas as permissões do admin relacionadas a sessões
SELECT 
    u.username,
    sf.name as feature_name,
    p.action,
    p.description,
    sf.url
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin' 
  AND (sf.name ILIKE '%sess%' OR p.description ILIKE '%sess%')
ORDER BY sf.name, p.action;

-- 3. Verificar se a funcionalidade Sessões está na sidebar
SELECT 
    smi.id,
    smi.name,
    smi.url,
    smi.is_active,
    sf.name as feature_name
FROM sidebar_menu_items smi
JOIN system_features sf ON smi.feature_id = sf.id
WHERE sf.name = 'Sessões'
ORDER BY smi.order_index;

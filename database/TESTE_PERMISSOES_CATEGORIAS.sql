-- ============================================================
-- TESTE DE PERMISSÕES PARA CATEGORIAS
-- ============================================================
-- Objetivo: Verificar se o usuário admin tem permissão para acessar categorias
-- ============================================================

-- 1. Verificar se o usuário admin tem permissão para "Categorias de Funcionalidades"
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
  AND sf.name = 'Categorias de Funcionalidades'
ORDER BY p.action;

-- 2. Verificar todas as permissões do usuário admin relacionadas a categorias
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
  AND sf.name ILIKE '%categoria%'
ORDER BY sf.name, p.action;

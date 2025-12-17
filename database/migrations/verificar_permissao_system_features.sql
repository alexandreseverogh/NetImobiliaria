-- Script de Verificação: Verificar permissões de system-features para usuário admin
-- Execute este script para diagnosticar problemas

-- 1. Verificar slug da funcionalidade "Funcionalidades do Sistema"
SELECT 
    'VERIFICAÇÃO FUNCIONALIDADE' as tipo,
    sf.id,
    sf.name,
    sf.slug,
    sf.url,
    sf."Crud_Execute",
    sf.is_active
FROM system_features sf
WHERE sf.name ILIKE '%funcionalidades%' OR sf.slug ILIKE '%funcionalidades%'
ORDER BY sf.id;

-- 2. Verificar permissões criadas para esta funcionalidade
SELECT 
    'VERIFICAÇÃO PERMISSÕES' as tipo,
    p.id,
    p.action,
    p.description,
    sf.name as funcionalidade,
    sf.slug
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.name ILIKE '%funcionalidades%' OR sf.slug ILIKE '%funcionalidades%'
ORDER BY p.action;

-- 3. Verificar se permissões foram atribuídas aos roles Super Admin e Administrador
SELECT 
    'VERIFICAÇÃO ROLE_PERMISSIONS' as tipo,
    ur.name as role,
    ur.id as role_id,
    p.action,
    sf.name as funcionalidade,
    sf.slug
FROM role_permissions rp
JOIN user_roles ur ON rp.role_id = ur.id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE (sf.name ILIKE '%funcionalidades%' OR sf.slug ILIKE '%funcionalidades%')
  AND ur.name IN ('Super Admin', 'Administrador')
ORDER BY ur.name, p.action;

-- 4. Verificar usuário admin e seus roles
SELECT 
    'VERIFICAÇÃO USUÁRIO ADMIN' as tipo,
    u.id,
    u.username,
    u.email,
    ur.name as role,
    ur.id as role_id
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin' OR u.email = 'admin@admin.com'
ORDER BY ur.name;

-- 5. Verificar permissões do usuário admin para funcionalidades
SELECT 
    'PERMISSÕES DO USUÁRIO ADMIN' as tipo,
    u.username,
    ur.name as role,
    sf.name as funcionalidade,
    sf.slug,
    p.action
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE (u.username = 'admin' OR u.email = 'admin@admin.com')
  AND (sf.name ILIKE '%funcionalidades%' OR sf.slug ILIKE '%funcionalidades%')
ORDER BY sf.slug, p.action;


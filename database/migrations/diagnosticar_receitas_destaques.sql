-- Script de Diagnóstico: Verificar por que Receitas de Destaques não aparece na sidebar
-- Execute este script para identificar o problema

-- 1. Verificar funcionalidade
SELECT 
    '1. FUNCIONALIDADE' as etapa,
    sf.id,
    sf.name,
    sf.slug,
    sf.category_id,
    sf.is_active,
    sf."Crud_Execute",
    sc.name as categoria_nome
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
WHERE sf.id = 57 OR sf.slug = 'receitas-destaques';

-- 2. Verificar permissões
SELECT 
    '2. PERMISSÕES' as etapa,
    p.id,
    p.feature_id,
    p.action,
    p.description
FROM permissions p
WHERE p.feature_id = 57;

-- 3. Verificar role_permissions
SELECT 
    '3. ROLE_PERMISSIONS' as etapa,
    rp.id,
    rp.role_id,
    rp.permission_id,
    rp.is_active,
    ur.name as role_name,
    p.action as permission_action
FROM role_permissions rp
JOIN user_roles ur ON rp.role_id = ur.id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.feature_id = 57;

-- 4. Verificar user_role_assignments do admin
SELECT 
    '4. USER_ROLE_ASSIGNMENTS (ADMIN)' as etapa,
    u.id as user_id,
    u.username,
    ura.role_id,
    ura.is_active as ura_ativo,
    ur.name as role_name
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin';

-- 5. Verificar se a query da API retornaria a funcionalidade
SELECT 
    '5. QUERY API (SIMULAÇÃO)' as etapa,
    sf.id,
    sf.name,
    sf.category_id,
    sc.name as category_name,
    p.action,
    rp.is_active as rp_ativo,
    ura.is_active as ura_ativo,
    u.username
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
JOIN permissions p ON sf.id = p.feature_id
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN user_role_assignments ura ON rp.role_id = ura.role_id
JOIN users u ON ura.user_id = u.id
WHERE u.username = 'admin'
AND sf.id = 57
AND sf.is_active = true
AND rp.is_active = true
AND ura.is_active = true;

-- 6. Verificar categorias disponíveis
SELECT 
    '6. CATEGORIAS DISPONÍVEIS' as etapa,
    id,
    name,
    slug,
    is_active,
    sort_order
FROM system_categorias
WHERE is_active = true
ORDER BY sort_order, name;








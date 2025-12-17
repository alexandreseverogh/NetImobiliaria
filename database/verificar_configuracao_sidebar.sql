-- ============================================================
-- VERIFICAR: POR QUE "CONFIGURAÇÃO DA SIDEBAR" NÃO APARECE
-- Data: 27/10/2025
-- ============================================================

-- 1. VERIFICAR SE FUNCIONALIDADE FOI CRIADA
SELECT 
    'FUNCIONALIDADE' as tipo,
    id,
    name as nome,
    url,
    is_active,
    category_id
FROM system_features
WHERE name = 'Configuração da Sidebar'
   OR url = '/admin/configuracoes/sidebar';

-- 2. VERIFICAR SE PERMISSÃO FOI CRIADA
SELECT 
    'PERMISSÃO' as tipo,
    p.id,
    p.feature_id,
    p.action,
    p.description
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.name = 'Configuração da Sidebar'
   OR sf.url = '/admin/configuracoes/sidebar';

-- 3. VERIFICAR SE ITEM FOI ADICIONADO À SIDEBAR
SELECT 
    'ITEM SIDEBAR' as tipo,
    smi.id,
    smi.name as nome,
    smi.url,
    smi.order_index,
    smi.is_active,
    smi.parent_id,
    smi.roles_required,
    (SELECT name FROM sidebar_menu_items WHERE id = smi.parent_id) as parent_name
FROM sidebar_menu_items smi
WHERE smi.name = 'Configuração da Sidebar'
   OR smi.url = '/admin/configuracoes/sidebar';

-- 4. VERIFICAR SE PERMISSÕES FORAM ATRIBUÍDAS AOS ROLES
SELECT 
    'PERMISSÕES POR ROLE' as tipo,
    ur.name as role_name,
    sf.name as feature_name,
    p.action,
    rp.granted_at
FROM user_roles ur
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.name = 'Configuração da Sidebar'
   OR sf.url = '/admin/configuracoes/sidebar'
ORDER BY ur.name, p.action;

-- 5. VERIFICAR ROLE DO USUÁRIO ADMIN
SELECT 
    'USUÁRIO ADMIN' as tipo,
    u.id,
    u.username,
    u.email,
    ur.id as role_id,
    ur.name as role_name,
    ur.level
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin' OR u.email = 'admin@123';

-- 6. VERIFICAR SE ADMIN TEM AS PERMISSÕES
SELECT 
    'PERMISSÕES DO ADMIN' as tipo,
    ur.name as role_name,
    sf.name as feature_name,
    p.action,
    p.description
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE (u.username = 'admin' OR u.email = 'admin@123')
  AND (sf.name = 'Configuração da Sidebar' OR sf.url = '/admin/configuracoes/sidebar')
ORDER BY sf.name, p.action;

-- 7. VERIFICAR SE ITEM APARECE NO MENU DO USUÁRIO (via função)
SELECT 
    'ITENS DO MENU DO ADMIN' as tipo,
    smi.id,
    smi.name,
    smi.url,
    smi.is_active,
    (SELECT name FROM sidebar_menu_items WHERE id = smi.parent_id) as parent_name
FROM sidebar_menu_items smi
WHERE smi.is_active = true
  AND (smi.name = 'Configuração da Sidebar' OR smi.url = '/admin/configuracoes/sidebar');

-- 8. VERIFICAR ROLES_REQUIRED DO ITEM
SELECT 
    'CONFIGURAÇÃO ROLES' as tipo,
    smi.name,
    smi.roles_required,
    CASE 
        WHEN 'Super Admin' = ANY(ARRAY(SELECT jsonb_array_elements_text(smi.roles_required))) THEN 'Super Admin OK'
        ELSE 'Super Admin FALTANDO'
    END as super_admin_check,
    CASE 
        WHEN 'Administrador' = ANY(ARRAY(SELECT jsonb_array_elements_text(smi.roles_required))) THEN 'Administrador OK'
        ELSE 'Administrador FALTANDO'
    END as admin_check
FROM sidebar_menu_items smi
WHERE smi.name = 'Configuração da Sidebar'
   OR smi.url = '/admin/configuracoes/sidebar';


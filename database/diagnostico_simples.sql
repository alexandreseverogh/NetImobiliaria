-- DIAGNÓSTICO SIMPLES: POR QUE ITEM NÃO APARECE

-- 1. ITEM ESTÁ NA SIDEBAR?
SELECT '1. Item na Sidebar?' as verificacao,
       CASE WHEN EXISTS (
           SELECT 1 FROM sidebar_menu_items 
           WHERE name = 'Configuração da Sidebar'
       ) THEN 'SIM ✅' ELSE 'NÃO ❌' END as resultado;

-- 2. ITEM ESTÁ ATIVO?
SELECT '2. Item está ativo?' as verificacao,
       is_active as resultado
FROM sidebar_menu_items 
WHERE name = 'Configuração da Sidebar';

-- 3. QUAL ROLE O ADMIN TEM?
SELECT '3. Role do Admin' as verificacao,
       ur.name as role_name,
       ur.level
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin' OR u.email = 'admin@123';

-- 4. ADMIN TEM PERMISSÃO PARA FUNCIONALIDADE?
SELECT '4. Admin tem permissão?' as verificacao,
       CASE WHEN COUNT(*) > 0 THEN 'SIM ✅' ELSE 'NÃO ❌' END as resultado,
       COUNT(*) as permissoes_count
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE (u.username = 'admin' OR u.email = 'admin@123')
  AND (sf.name = 'Configuração da Sidebar' OR sf.url = '/admin/configuracoes/sidebar');

-- 5. QUAL É O RESOURCE DO ITEM?
SELECT '5. Resource do item' as verificacao,
       resource,
       roles_required,
       is_active
FROM sidebar_menu_items 
WHERE name = 'Configuração da Sidebar';

-- 6. VERIFICAR SE É PROBLEMA DE PERMISSIONGUARD
SELECT '6. Feature e Permissions criadas?' as verificacao,
       (SELECT COUNT(*) FROM system_features WHERE name = 'Configuração da Sidebar') as features_count,
       (SELECT COUNT(*) FROM permissions WHERE feature_id = (SELECT id FROM system_features WHERE name = 'Configuração da Sidebar')) as permissions_count,
       (SELECT COUNT(*) FROM role_permissions WHERE permission_id IN (
           SELECT id FROM permissions WHERE feature_id = (SELECT id FROM system_features WHERE name = 'Configuração da Sidebar')
       )) as role_permissions_count;


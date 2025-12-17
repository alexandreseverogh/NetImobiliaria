-- ============================================================
-- DIAGNÓSTICO: POR QUE ADMIN NÃO TEM PERMISSÃO
-- Data: 27/10/2025
-- ============================================================

-- 1. VERIFICAR SE PERMISSÃO FOI CRIADA
SELECT 
    '1. Permissão criada?' as verificacao,
    COUNT(*) as total
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.name = 'Configuração da Sidebar';

-- 2. VERIFICAR SE PERMISSÃO FOI ATRIBUÍDA AOS ROLES
SELECT 
    '2. Permissão nos roles?' as verificacao,
    ur.name as role,
    sf.name as feature,
    p.action,
    CASE WHEN rp.id IS NOT NULL THEN 'SIM ✅' ELSE 'NÃO ❌' END as tem_permissao
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
CROSS JOIN user_roles ur
LEFT JOIN role_permissions rp ON ur.id = rp.role_id AND p.id = rp.permission_id
WHERE sf.name = 'Configuração da Sidebar'
  AND ur.name IN ('Super Admin', 'Administrador');

-- 3. VERIFICAR O QUE O ADMIN TEM
SELECT 
    '3. O que admin tem?' as verificacao,
    ur.name as role_admin,
    sf.name as feature,
    p.action,
    CASE WHEN rp.id IS NOT NULL THEN 'TEM ✅' ELSE 'NÃO TEM ❌' END as status
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
LEFT JOIN role_permissions rp ON ur.id = rp.role_id
LEFT JOIN permissions p ON rp.permission_id = p.id
LEFT JOIN system_features sf ON p.feature_id = sf.id
WHERE (u.username = 'admin' OR u.email = 'admin@123')
  AND (sf.name = 'Configuração da Sidebar' OR sf.name IS NULL)
ORDER BY sf.name NULLS FIRST;

-- 4. VERIFICAR QUAL É O RESOURCE CORRETO
SELECT 
    '4. Resource da funcionalidade' as verificacao,
    sf.name,
    sf.url,
    p.action,
    'system-features' as resource_correto
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf.name = 'Configuração da Sidebar'
   OR sf.url = '/admin/configuracoes/sidebar';


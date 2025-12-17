-- Script de Verificação: Verificar se a funcionalidade Receitas de Destaques foi criada corretamente
-- Execute este script para diagnosticar problemas

-- 1. Verificar se a funcionalidade existe
SELECT 
    'VERIFICAÇÃO FUNCIONALIDADE' as tipo,
    sf.id,
    sf.name,
    sf.slug,
    sf.url,
    sf."Crud_Execute",
    sf.is_active
FROM system_features sf
WHERE sf.name = 'Receitas de Destaques' OR sf.slug = 'receitas-destaques';

-- 2. Verificar se a permissão EXECUTE foi criada
SELECT 
    'VERIFICAÇÃO PERMISSÃO' as tipo,
    p.id,
    p.action,
    p.description,
    sf.name as funcionalidade,
    sf.slug
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.name = 'Receitas de Destaques' OR sf.slug = 'receitas-destaques';

-- 3. Verificar se a permissão foi atribuída aos roles
SELECT 
    'VERIFICAÇÃO ROLE_PERMISSIONS' as tipo,
    ur.name as role,
    p.action,
    sf.name as funcionalidade
FROM role_permissions rp
JOIN user_roles ur ON rp.role_id = ur.id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.name = 'Receitas de Destaques' OR sf.slug = 'receitas-destaques';

-- 4. Verificar rotas configuradas
SELECT 
    'VERIFICAÇÃO ROTAS' as tipo,
    rpc.route_pattern,
    rpc.method,
    rpc.default_action,
    sf.name as funcionalidade
FROM route_permissions_config rpc
JOIN system_features sf ON rpc.feature_id = sf.id
WHERE sf.name = 'Receitas de Destaques' OR sf.slug = 'receitas-destaques';

-- 5. Verificar permissões do usuário admin
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
  AND (sf.name = 'Receitas de Destaques' OR sf.slug = 'receitas-destaques')
ORDER BY sf.slug, p.action;


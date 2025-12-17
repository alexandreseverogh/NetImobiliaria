-- ========================================
-- CRIAR PERMISSÕES PARA CATEGORIAS
-- ========================================
-- 
-- Este script cria permissões para o recurso 'categorias'
-- e atribui ao Super Admin

-- 1. VERIFICAR SE EXISTE FUNCIONALIDADE 'Categorias'
SELECT 
    'VERIFICAÇÃO' as tipo,
    sf.id,
    sf.name as funcionalidade,
    sf.description
FROM system_features sf
WHERE sf.name LIKE '%categor%'
ORDER BY sf.name;

-- 2. CRIAR FUNCIONALIDADE 'Categorias' SE NÃO EXISTIR
INSERT INTO system_features (name, description, category_id, url, is_active)
SELECT 
    'Categorias',
    'Gestão de categorias do sistema',
    (SELECT id FROM system_categorias WHERE name = 'Sistema' LIMIT 1),
    '/admin/categorias',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM system_features 
    WHERE name = 'Categorias'
);

-- 3. CRIAR PERMISSÕES PARA CATEGORIAS
INSERT INTO permissions (feature_id, action, description)
SELECT 
    sf.id,
    'READ',
    'Permissão de leitura para Categorias'
FROM system_features sf
WHERE sf.name = 'Categorias'
AND NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.feature_id = sf.id AND p.action = 'READ'
);

INSERT INTO permissions (feature_id, action, description)
SELECT 
    sf.id,
    'WRITE',
    'Permissão de escrita para Categorias'
FROM system_features sf
WHERE sf.name = 'Categorias'
AND NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.feature_id = sf.id AND p.action = 'WRITE'
);

INSERT INTO permissions (feature_id, action, description)
SELECT 
    sf.id,
    'DELETE',
    'Permissão de exclusão para Categorias'
FROM system_features sf
WHERE sf.name = 'Categorias'
AND NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.feature_id = sf.id AND p.action = 'DELETE'
);

-- 4. ATRIBUIR PERMISSÕES AO SUPER ADMIN
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    ur.id,
    p.id
FROM user_roles ur
CROSS JOIN permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.name = 'Super Admin'
AND sf.name = 'Categorias'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = ur.id AND rp.permission_id = p.id
);

-- 5. VERIFICAR PERMISSÕES CRIADAS
SELECT 
    'PERMISSÕES CRIADAS' as tipo,
    sf.name as funcionalidade,
    p.action,
    ur.name as role,
    COUNT(rp.id) as atribuicoes
FROM system_features sf
JOIN permissions p ON sf.id = p.feature_id
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN user_roles ur ON rp.role_id = ur.id
WHERE sf.name = 'Categorias'
GROUP BY sf.name, p.action, ur.name
ORDER BY p.action;

-- 6. RESUMO FINAL
SELECT 
    'RESUMO' as tipo,
    'Funcionalidade Categorias: ' || (SELECT COUNT(*) FROM system_features WHERE name = 'Categorias') as info
UNION ALL
SELECT 
    'RESUMO' as tipo,
    'Permissões para Categorias: ' || (SELECT COUNT(*) FROM permissions p JOIN system_features sf ON p.feature_id = sf.id WHERE sf.name = 'Categorias') as info
UNION ALL
SELECT 
    'RESUMO' as tipo,
    'Atribuições ao Super Admin: ' || (SELECT COUNT(*) FROM role_permissions rp JOIN permissions p ON rp.permission_id = p.id JOIN system_features sf ON p.feature_id = sf.id JOIN user_roles ur ON rp.role_id = ur.id WHERE sf.name = 'Categorias' AND ur.name = 'Super Admin') as info;





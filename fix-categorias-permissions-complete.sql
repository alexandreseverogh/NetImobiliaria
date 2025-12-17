-- ========================================
-- CORRIGIR PERMISSÕES PARA CATEGORIAS - COMPLETO
-- ========================================

-- 1. CRIAR/GARANTIR FUNCIONALIDADE CATEGORIAS
INSERT INTO system_features (name, description, category_id, url, is_active)
SELECT 
    'Categorias',
    'Gestão de categorias do sistema',
    (SELECT id FROM system_categorias WHERE name = 'Sistema' LIMIT 1),
    '/admin/categorias',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM system_features WHERE name = 'Categorias'
);

-- 2. CRIAR PERMISSÕES PARA CATEGORIAS
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

-- 3. ATRIBUIR PERMISSÕES AO SUPER ADMIN
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

-- 4. VERIFICAR RESULTADO
SELECT 
    'RESULTADO' as tipo,
    sf.name as funcionalidade,
    p.action,
    ur.name as role,
    'CRIADO' as status
FROM system_features sf
JOIN permissions p ON sf.id = p.feature_id
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN user_roles ur ON rp.role_id = ur.id
WHERE sf.name = 'Categorias'
AND ur.name = 'Super Admin';





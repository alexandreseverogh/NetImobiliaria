-- ========================================
-- VERIFICAR FUNCIONALIDADES DO SISTEMA
-- ========================================
-- 
-- Este script verifica se as funcionalidades do sistema
-- estão criadas corretamente para o middleware funcionar.

-- 1. VERIFICAR FUNCIONALIDADES EXISTENTES
SELECT 
    sf.id,
    sf.name,
    sf.category,
    sf.is_active,
    COUNT(p.id) as permissions_count
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
GROUP BY sf.id, sf.name, sf.category, sf.is_active
ORDER BY sf.name;

-- 2. VERIFICAR PERMISSÕES DO SUPER ADMIN
SELECT 
    ur.name as role_name,
    ur.level,
    sf.name as feature_name,
    p.action,
    rp.granted_at
FROM user_role_assignments ura
JOIN user_roles ur ON ura.role_id = ur.id
JOIN role_permissions rp ON ur.id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.level >= 50
ORDER BY sf.name, p.action;

-- 3. VERIFICAR SE EXISTE FUNCIONALIDADE PARA SYSTEM-FEATURES
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM system_features 
            WHERE name LIKE '%funcionalidade%' 
            OR name LIKE '%system%' 
            OR name LIKE '%feature%'
        ) 
        THEN 'FUNCIONALIDADE EXISTE' 
        ELSE 'FUNCIONALIDADE NÃO EXISTE' 
    END as status;

-- 4. CRIAR FUNCIONALIDADE SE NÃO EXISTIR
INSERT INTO system_features (name, description, category, url, is_active, created_by)
SELECT 
    'Gestão de Funcionalidades',
    'Gerenciar funcionalidades do sistema administrativo',
    'sistema',
    '/admin/system-features',
    true,
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
WHERE NOT EXISTS (
    SELECT 1 FROM system_features 
    WHERE name = 'Gestão de Funcionalidades'
);

-- 5. CRIAR PERMISSÕES PARA A FUNCIONALIDADE
INSERT INTO permissions (feature_id, action, description, is_system_permission)
SELECT 
    sf.id,
    action,
    description,
    true
FROM system_features sf
CROSS JOIN (
    VALUES 
        ('READ', 'Visualizar funcionalidades'),
        ('WRITE', 'Criar/editar funcionalidades'),
        ('DELETE', 'Excluir funcionalidades'),
        ('ADMIN', 'Administrar funcionalidades')
) as perms(action, description)
WHERE sf.name = 'Gestão de Funcionalidades'
AND NOT EXISTS (
    SELECT 1 FROM permissions p 
    WHERE p.feature_id = sf.id 
    AND p.action = perms.action
);

-- 6. ATRIBUIR PERMISSÕES AO SUPER ADMIN
INSERT INTO role_permissions (role_id, permission_id, granted_by)
SELECT 
    ur.id,
    p.id,
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
FROM user_roles ur
JOIN permissions p ON 1=1
JOIN system_features sf ON p.feature_id = sf.id
WHERE ur.level >= 50
AND sf.name = 'Gestão de Funcionalidades'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = ur.id 
    AND rp.permission_id = p.id
);

-- 7. VERIFICAR RESULTADO FINAL
SELECT 
    'RESULTADO FINAL' as status,
    sf.name as feature_name,
    COUNT(p.id) as total_permissions,
    COUNT(rp.id) as assigned_permissions
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
LEFT JOIN role_permissions rp ON p.id = rp.permission_id
WHERE sf.name = 'Gestão de Funcionalidades'
GROUP BY sf.id, sf.name;


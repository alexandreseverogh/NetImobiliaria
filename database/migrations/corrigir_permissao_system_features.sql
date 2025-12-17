-- Script de Correção: Garantir que Super Admin e Administrador tenham permissões UPDATE e DELETE
-- para a funcionalidade "Funcionalidades do Sistema"
-- Execute este script se as permissões não estiverem atribuídas

DO $$
DECLARE
    feature_id INTEGER;
    permission_update_id INTEGER;
    permission_delete_id INTEGER;
    super_admin_role_id INTEGER;
    administrador_role_id INTEGER;
BEGIN
    -- 1. Buscar ID da funcionalidade "Funcionalidades do Sistema"
    SELECT id INTO feature_id 
    FROM system_features 
    WHERE slug = 'funcionalidades-sistema' 
       OR name ILIKE '%funcionalidades%'
    LIMIT 1;
    
    IF feature_id IS NULL THEN
        RAISE EXCEPTION 'Funcionalidade "Funcionalidades do Sistema" não encontrada!';
    END IF;
    
    RAISE NOTICE 'Funcionalidade encontrada: ID = %', feature_id;
    
    -- 2. Buscar ou criar permissão UPDATE
    SELECT id INTO permission_update_id 
    FROM permissions 
    WHERE feature_id = feature_id AND action = 'update';
    
    IF permission_update_id IS NULL THEN
        INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
        VALUES (feature_id, 'update', 'Editar Funcionalidades do Sistema', NOW(), NOW())
        RETURNING id INTO permission_update_id;
        RAISE NOTICE 'Permissão UPDATE criada: ID = %', permission_update_id;
    ELSE
        RAISE NOTICE 'Permissão UPDATE já existe: ID = %', permission_update_id;
    END IF;
    
    -- 3. Buscar ou criar permissão DELETE
    SELECT id INTO permission_delete_id 
    FROM permissions 
    WHERE feature_id = feature_id AND action = 'delete';
    
    IF permission_delete_id IS NULL THEN
        INSERT INTO permissions (feature_id, action, description, created_at, updated_at)
        VALUES (feature_id, 'delete', 'Excluir Funcionalidades do Sistema', NOW(), NOW())
        RETURNING id INTO permission_delete_id;
        RAISE NOTICE 'Permissão DELETE criada: ID = %', permission_delete_id;
    ELSE
        RAISE NOTICE 'Permissão DELETE já existe: ID = %', permission_delete_id;
    END IF;
    
    -- 4. Buscar IDs dos roles
    SELECT id INTO super_admin_role_id FROM user_roles WHERE name = 'Super Admin';
    SELECT id INTO administrador_role_id FROM user_roles WHERE name = 'Administrador';
    
    IF super_admin_role_id IS NULL THEN
        RAISE EXCEPTION 'Role "Super Admin" não encontrada!';
    END IF;
    
    IF administrador_role_id IS NULL THEN
        RAISE EXCEPTION 'Role "Administrador" não encontrada!';
    END IF;
    
    -- 5. Atribuir permissão UPDATE ao Super Admin
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    SELECT super_admin_role_id, permission_update_id, NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM role_permissions 
        WHERE role_id = super_admin_role_id AND permission_id = permission_update_id
    );
    
    -- 6. Atribuir permissão UPDATE ao Administrador
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    SELECT administrador_role_id, permission_update_id, NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM role_permissions 
        WHERE role_id = administrador_role_id AND permission_id = permission_update_id
    );
    
    -- 7. Atribuir permissão DELETE ao Super Admin
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    SELECT super_admin_role_id, permission_delete_id, NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM role_permissions 
        WHERE role_id = super_admin_role_id AND permission_id = permission_delete_id
    );
    
    -- 8. Atribuir permissão DELETE ao Administrador
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    SELECT administrador_role_id, permission_delete_id, NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM role_permissions 
        WHERE role_id = administrador_role_id AND permission_id = permission_delete_id
    );
    
    RAISE NOTICE '✅ Permissões UPDATE e DELETE atribuídas com sucesso!';
    
END $$;

-- Verificação final
SELECT 
    'VERIFICAÇÃO FINAL' as tipo,
    ur.name as role,
    sf.slug as funcionalidade,
    p.action,
    '✅ OK' as status
FROM role_permissions rp
JOIN user_roles ur ON rp.role_id = ur.id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE (sf.slug = 'funcionalidades-sistema' OR sf.name ILIKE '%funcionalidades%')
  AND ur.name IN ('Super Admin', 'Administrador')
  AND p.action IN ('update', 'delete')
ORDER BY ur.name, p.action;








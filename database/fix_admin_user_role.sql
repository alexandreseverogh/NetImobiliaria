-- ============================================================
-- GARANTIR QUE O ADMIN TEM UM ROLE ASSOCIADO
-- ============================================================

-- 1. VERIFICAR SE O ADMIN TEM ROLE ASSIGNADO
SELECT 
    u.id,
    u.username,
    u.email,
    ura.id as assignment_id,
    ura.role_id,
    ur.name as role_name
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin' OR u.email = 'admin@123';

-- 2. BUSCAR O ROLE ID DE "Super Admin" OU "Admin"
SELECT id, name, level FROM user_roles WHERE name IN ('Super Admin', 'Admin', 'Administrador') ORDER BY level DESC LIMIT 1;

-- 3. VERIFICAR SE EXISTE ROLE APPROPRIADO, SE NÃO CRIAR
DO $$
DECLARE
    admin_user_id UUID;
    super_admin_role_id INTEGER;
    assignment_exists BOOLEAN;
BEGIN
    -- Buscar ID do admin
    SELECT id INTO admin_user_id FROM users WHERE username = 'admin' OR email = 'admin@123';
    
    IF admin_user_id IS NULL THEN
        RAISE NOTICE 'ERRO: Usuário admin não encontrado';
        RETURN;
    END IF;
    
    -- Buscar ou criar role "Super Admin"
    SELECT id INTO super_admin_role_id FROM user_roles WHERE name = 'Super Admin' LIMIT 1;
    
    IF super_admin_role_id IS NULL THEN
        -- Criar role Super Admin
        INSERT INTO user_roles (name, description, level, is_active, requires_2fa, is_system_role)
        VALUES ('Super Admin', 'Super Administrador com acesso total', 10, true, false, true)
        RETURNING id INTO super_admin_role_id;
        
        RAISE NOTICE 'Role Super Admin criado: %', super_admin_role_id;
    END IF;
    
    -- Verificar se já existe assignment
    SELECT EXISTS(
        SELECT 1 FROM user_role_assignments 
        WHERE user_id = admin_user_id AND role_id = super_admin_role_id
    ) INTO assignment_exists;
    
    IF NOT assignment_exists THEN
        -- Criar assignment
        INSERT INTO user_role_assignments (user_id, role_id, assigned_at, is_active)
        VALUES (admin_user_id, super_admin_role_id, NOW(), true);
        
        RAISE NOTICE 'Assignment criado: admin -> Super Admin';
    ELSE
        RAISE NOTICE 'Assignment já existe';
    END IF;
END $$;

-- 4. VERIFICAR RESULTADO
SELECT 
    u.id,
    u.username,
    u.email,
    ura.id as assignment_id,
    ura.role_id,
    ur.name as role_name,
    ur.level,
    ur.is_active
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin' OR u.email = 'admin@123';


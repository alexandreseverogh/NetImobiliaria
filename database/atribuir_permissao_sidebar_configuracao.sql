-- ============================================================
-- ATRIBUIR PERMISSÃO: CONFIGURAÇÃO DA SIDEBAR AOS ROLES
-- Data: 27/10/2025
-- ============================================================

DO $$
DECLARE
    v_feature_id INTEGER;
    v_permission_id INTEGER;
    v_role_id INTEGER;
BEGIN
    -- 1. Buscar ID da funcionalidade
    SELECT id INTO v_feature_id
    FROM system_features
    WHERE name = 'Configuração da Sidebar'
       OR url = '/admin/configuracoes/sidebar'
    LIMIT 1;

    IF v_feature_id IS NULL THEN
        RAISE NOTICE 'ERRO: Funcionalidade não encontrada!';
        RETURN;
    END IF;

    RAISE NOTICE 'Funcionalidade encontrada: ID %', v_feature_id;

    -- 2. Buscar ID da permissão
    SELECT id INTO v_permission_id
    FROM permissions
    WHERE feature_id = v_feature_id
      AND action = 'ADMIN'
    LIMIT 1;

    IF v_permission_id IS NULL THEN
        RAISE NOTICE 'ERRO: Permissão não encontrada!';
        RETURN;
    END IF;

    RAISE NOTICE 'Permissão encontrada: ID %', v_permission_id;

    -- 3. Atribuir permissão ao Super Admin
    SELECT id INTO v_role_id
    FROM user_roles
    WHERE name = 'Super Admin';

    IF v_role_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM role_permissions 
            WHERE role_id = v_role_id AND permission_id = v_permission_id
        ) THEN
            INSERT INTO role_permissions (role_id, permission_id, granted_at)
            VALUES (v_role_id, v_permission_id, NOW());
            RAISE NOTICE 'Permissão atribuída ao Super Admin';
        ELSE
            RAISE NOTICE 'Permissão já existe para Super Admin';
        END IF;
    ELSE
        RAISE NOTICE 'WARNING: Role Super Admin não encontrado';
    END IF;

    -- 4. Atribuir permissão ao Administrador
    SELECT id INTO v_role_id
    FROM user_roles
    WHERE name = 'Administrador';

    IF v_role_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM role_permissions 
            WHERE role_id = v_role_id AND permission_id = v_permission_id
        ) THEN
            INSERT INTO role_permissions (role_id, permission_id, granted_at)
            VALUES (v_role_id, v_permission_id, NOW());
            RAISE NOTICE 'Permissão atribuída ao Administrador';
        ELSE
            RAISE NOTICE 'Permissão já existe para Administrador';
        END IF;
    ELSE
        RAISE NOTICE 'WARNING: Role Administrador não encontrado';
    END IF;

    RAISE NOTICE 'Processo concluído com sucesso!';
END $$;

-- VERIFICAR RESULTADO
SELECT 
    'Verificação' as tipo,
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
ORDER BY ur.name;


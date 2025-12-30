-- 014_fix_parametros_permissions.sql
-- Cria o recurso 'parametros' e atribui as permissões necessárias para o Administrador.

DO $$
DECLARE
    v_category_id INTEGER;
    v_feature_id INTEGER;
    v_permission_id INTEGER;
    v_admin_role_id INTEGER := 2; -- Administrador
    v_superadmin_role_id INTEGER := 1; -- Super Admin
    v_created_by_uuid UUID;
BEGIN
    -- 1. Obter um UUID de administrador para created_by
    SELECT id INTO v_created_by_uuid FROM users WHERE username = 'admin' LIMIT 1;
    IF v_created_by_uuid IS NULL THEN
        SELECT id INTO v_created_by_uuid FROM users LIMIT 1;
    END IF;

    -- 2. Garantir que a categoria 'Administração' existe (ID 2 conforme verificado)
    v_category_id := 2;

    -- 3. Criar a feature 'parametros' se não existir
    IF NOT EXISTS (SELECT 1 FROM public.system_features WHERE slug = 'parametros') THEN
        INSERT INTO public.system_features (name, description, category_id, url, is_active, slug)
        VALUES ('Parâmetros', 'Configurações globais do sistema', v_category_id, '/admin/parametros', true, 'parametros')
        RETURNING id INTO v_feature_id;
        
        -- 4. Vincular à categoria na tabela de junção
        INSERT INTO public.system_feature_categorias (feature_id, category_id, sort_order, created_by)
        VALUES (v_feature_id, v_category_id, 10, v_created_by_uuid);
    ELSE
        SELECT id INTO v_feature_id FROM public.system_features WHERE slug = 'parametros';
    END IF;

    -- 5. Criar a permissão 'execute' para esta feature
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE feature_id = v_feature_id AND action = 'execute') THEN
        INSERT INTO public.permissions (feature_id, action, description)
        VALUES (v_feature_id, 'execute', 'Permite acessar a página de parâmetros')
        RETURNING id INTO v_permission_id;
    ELSE
        SELECT id INTO v_permission_id FROM public.permissions WHERE feature_id = v_feature_id AND action = 'execute';
    END IF;

    -- 6. Atribuir a permissão ao Administrador (ID 2)
    IF NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role_id = v_admin_role_id AND permission_id = v_permission_id) THEN
        INSERT INTO public.role_permissions (role_id, permission_id, granted_by)
        VALUES (v_admin_role_id, v_permission_id, v_created_by_uuid);
    END IF;

    -- 7. Atribuir a permissão ao Super Admin (ID 1)
    IF NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role_id = v_superadmin_role_id AND permission_id = v_permission_id) THEN
        INSERT INTO public.role_permissions (role_id, permission_id, granted_by)
        VALUES (v_superadmin_role_id, v_permission_id, v_created_by_uuid);
    END IF;

    -- 8. Criar permissão 'write' também para salvar alterações
    IF NOT EXISTS (SELECT 1 FROM public.permissions WHERE feature_id = v_feature_id AND action = 'write') THEN
        INSERT INTO public.permissions (feature_id, action, description)
        VALUES (v_feature_id, 'write', 'Permite alterar os parâmetros do sistema')
        RETURNING id INTO v_permission_id;
    ELSE
        SELECT id INTO v_permission_id FROM public.permissions WHERE feature_id = v_feature_id AND action = 'write';
    END IF;

    -- Atribuir 'write' ao Administrador
    IF NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role_id = v_admin_role_id AND permission_id = v_permission_id) THEN
        INSERT INTO public.role_permissions (role_id, permission_id, granted_by)
        VALUES (v_admin_role_id, v_permission_id, v_created_by_uuid);
    END IF;

    -- Atribuir 'write' ao Super Admin
    IF NOT EXISTS (SELECT 1 FROM public.role_permissions WHERE role_id = v_superadmin_role_id AND permission_id = v_permission_id) THEN
        INSERT INTO public.role_permissions (role_id, permission_id, granted_by)
        VALUES (v_superadmin_role_id, v_permission_id, v_created_by_uuid);
    END IF;

END $$;


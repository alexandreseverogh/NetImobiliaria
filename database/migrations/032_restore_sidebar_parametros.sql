-- Migração de Resgate: Restaurar menu Parametros e Permissões
-- Isso corrige o problema do menu ter sumido após migração para Docker

DO $$
DECLARE
    v_feature_id INTEGER;
    v_parent_id INTEGER;
    v_admin_role_id INTEGER;
BEGIN
    -- 0. Get Admin Role ID (Assume 'Admin' or ID 1)
    -- Tenta achar pelo nome 'Admin' ou 'Administrador' ou usa 1
    SELECT id INTO v_admin_role_id FROM user_roles WHERE name IN ('Admin', 'Administrador') LIMIT 1;
    IF v_admin_role_id IS NULL THEN
        v_admin_role_id := 1; -- Fallback padrao
    END IF;

    -- 1. Restore Feature 'parametros'
    SELECT id INTO v_feature_id FROM system_features WHERE code = 'parametros';
    IF v_feature_id IS NULL THEN
        INSERT INTO system_features (name, code, description) 
        VALUES ('Parâmetros', 'parametros', 'Configurações Gerais do Sistema')
        RETURNING id INTO v_feature_id;
    END IF;

    -- 2. Restore Permission 'view'
    INSERT INTO permissions (feature_id, action, description)
    SELECT v_feature_id, 'view', 'Visualizar Parâmetros'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE feature_id = v_feature_id AND action = 'view');
    
    -- Restore Permission 'edit' (just in case)
    INSERT INTO permissions (feature_id, action, description)
    SELECT v_feature_id, 'edit', 'Editar Parâmetros'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE feature_id = v_feature_id AND action = 'edit');

    -- 3. Grant Permissions to Admin
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, id FROM permissions WHERE feature_id = v_feature_id
    ON CONFLICT DO NOTHING;

    -- 4. Restore Sidebar Parent 'Parâmetros'
    -- Check if exists by resource/name
    SELECT id INTO v_parent_id FROM sidebar_menu_items WHERE resource = 'parametros' AND parent_id IS NULL LIMIT 1;
    
    IF v_parent_id IS NULL THEN
        INSERT INTO sidebar_menu_items (name, icon_name, resource, permission_required, permission_action, order_index, parent_id, url)
        VALUES ('Parâmetros', 'Cog6ToothIcon', 'parametros', 'parametros', 'view', 90, NULL, NULL)
        RETURNING id INTO v_parent_id;
    ELSE
        -- Update existing if needed (ensure icon/name)
        UPDATE sidebar_menu_items 
        SET icon_name = 'Cog6ToothIcon', name = 'Parâmetros' 
        WHERE id = v_parent_id;
    END IF;

    -- 5. Restore Sidebar Child 'Geral' (link to /admin/parametros)
    IF NOT EXISTS (SELECT 1 FROM sidebar_menu_items WHERE url = '/admin/parametros') THEN
        INSERT INTO sidebar_menu_items (name, icon_name, resource, permission_required, permission_action, order_index, parent_id, url)
        VALUES ('Geral', 'AdjustmentsHorizontalIcon', 'parametros', 'parametros', 'view', 10, v_parent_id, '/admin/parametros');
    ELSE
         -- If exists but orphaned, link it back
         UPDATE sidebar_menu_items 
         SET parent_id = v_parent_id, resource='parametros', permission_required='parametros', permission_action='view'
         WHERE url = '/admin/parametros';
    END IF;

END $$;

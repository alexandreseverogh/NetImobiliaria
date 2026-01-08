-- Migração 035: Correção Definitiva da Sidebar (Categories + Item Roles)
-- Cobre todas as possibilidades: Categoria faltante E Tabela de Ligação Item-Role

DO $$
DECLARE
    v_feature_id INTEGER;
    v_parent_item_id INTEGER;
    v_child_item_id INTEGER;
    v_admin_role_id INTEGER;
    v_sistema_cat_id INTEGER;
BEGIN
    -- 1. Obter IDs Básicos
    SELECT id INTO v_admin_role_id FROM user_roles WHERE name IN ('Admin', 'Administrador') LIMIT 1;
    IF v_admin_role_id IS NULL THEN v_admin_role_id := 1; END IF;

    SELECT id INTO v_feature_id FROM system_features WHERE slug = 'parametros';
    
    -- 2. Corrigir Categoria (Vincular a Sistema - ID 1)
    SELECT id INTO v_sistema_cat_id FROM system_categorias WHERE id = 1;
    
    IF v_feature_id IS NOT NULL AND v_sistema_cat_id IS NOT NULL THEN
        UPDATE system_features 
        SET category_id = v_sistema_cat_id, is_active = true 
        WHERE id = v_feature_id;
        RAISE NOTICE 'Feature linkada à Categoria 1 (Sistema)';
    END IF;

    -- 3. Obter IDs dos Itens de Menu (criados na migração 034)
    SELECT id INTO v_parent_item_id FROM sidebar_menu_items WHERE resource = 'parametros' AND parent_id IS NULL LIMIT 1;
    SELECT id INTO v_child_item_id FROM sidebar_menu_items WHERE resource = 'parametros' AND parent_id IS NOT NULL LIMIT 1;

    -- 4. Preencher tabela sidebar_item_roles (Se existir)
    -- Verificação defensiva se a tabela existe
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sidebar_item_roles') THEN
        
        -- Linkar Pai
        IF v_parent_item_id IS NOT NULL THEN
            INSERT INTO sidebar_item_roles (sidebar_item_id, role_id)
            VALUES (v_parent_item_id, v_admin_role_id)
            ON CONFLICT DO NOTHING;
            RAISE NOTICE 'Item Pai vinculado ao Admin na tabela sidebar_item_roles';
        END IF;

        -- Linkar Filho
        IF v_child_item_id IS NOT NULL THEN
            INSERT INTO sidebar_item_roles (sidebar_item_id, role_id)
            VALUES (v_child_item_id, v_admin_role_id)
            ON CONFLICT DO NOTHING;
            RAISE NOTICE 'Item Filho vinculado ao Admin na tabela sidebar_item_roles';
        END IF;
        
    END IF;
    
    -- 5. Fallback: Atualizar roles_required na própria tabela sidebar_menu_items (se for array)
    -- Alguns sistemas usam array de roles direto no item
    IF v_parent_item_id IS NOT NULL THEN
        UPDATE sidebar_menu_items 
        SET roles_required = array_append(roles_required, 'Admin') 
        WHERE id = v_parent_item_id AND NOT ('Admin' = ANY(roles_required));
    END IF;

END $$;

-- Migração 034: Forçar Restauração do Menu Parâmetros (Limpeza e Recriação)
-- Alinhando com a permissão 'execute' que o Admin já possui

DO $$
DECLARE
    v_feature_id INTEGER;
    v_parent_id INTEGER;
    v_admin_role_id INTEGER;
BEGIN
    -- 1. Obter ID Admin
    SELECT id INTO v_admin_role_id FROM user_roles WHERE name IN ('Admin', 'Administrador') LIMIT 1;
    IF v_admin_role_id IS NULL THEN v_admin_role_id := 1; END IF;

    -- 2. Obter ID Feature 'parametros'
    SELECT id INTO v_feature_id FROM system_features WHERE slug = 'parametros'; -- Usando slug!
    
    -- Fallback se não achar por slug (tenta code se existir coluna, ou cria)
    IF v_feature_id IS NULL THEN
        -- Tentar achar por nome/code se a coluna existir, mas vamos assumir que slug é o padrão agora
        -- Se não existe, CRIA.
        INSERT INTO system_features (name, description, slug, is_active)
        VALUES ('Parâmetros', 'Configurações Gerais', 'parametros', true)
        RETURNING id INTO v_feature_id;
    END IF;

    -- 3. Garantir Permissão 'execute' (pois é a que o Admin tem)
    INSERT INTO permissions (feature_id, action, description)
    SELECT v_feature_id, 'execute', 'Executar/Gerenciar Parâmetros'
    WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE feature_id = v_feature_id AND action = 'execute');

    -- 4. Garantir que Admin tem essa permissão
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT v_admin_role_id, id FROM permissions WHERE feature_id = v_feature_id AND action = 'execute'
    ON CONFLICT DO NOTHING;

    -- 5. LIMPEZA RADICAL: Remover itens antigos quebrados
    DELETE FROM sidebar_menu_items WHERE resource = 'parametros' OR name = 'Parâmetros';

    -- 6. Inserir Pai (Parâmetros) - Exige feature_id e action 'execute'
    INSERT INTO sidebar_menu_items (
        name, icon_name, resource, 
        feature_id, permission_required, permission_action, 
        order_index, parent_id, url
    )
    VALUES (
        'Parâmetros', 'Cog6ToothIcon', 'parametros', 
        v_feature_id, 'parametros', 'execute', 
        90, NULL, NULL
    )
    RETURNING id INTO v_parent_id;

    -- 7. Inserir Filho (Geral)
    INSERT INTO sidebar_menu_items (
        name, icon_name, resource, 
        feature_id, permission_required, permission_action, 
        order_index, parent_id, url
    )
    VALUES (
        'Geral', 'AdjustmentsHorizontalIcon', 'parametros', 
        v_feature_id, 'parametros', 'execute', 
        10, v_parent_id, '/admin/parametros'
    );

    RAISE NOTICE 'Menu Parâmetros restaurado com Feature ID %, Parent ID % e Action EXECUTE', v_feature_id, v_parent_id;

END $$;

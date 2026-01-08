-- Migração 036: Criar Categoria 'Parâmetros' e Corrigir Ícone
-- Atende solicitação de ter categoria específica e corrige ícone quebrado

DO $$
DECLARE
    v_new_cat_id INTEGER;
    v_feature_id INTEGER;
    v_parent_item_id INTEGER;
BEGIN
    -- 1. Criar Categoria 'Parâmetros' (se não existir)
    SELECT id INTO v_new_cat_id FROM system_categorias WHERE name = 'Parâmetros';
    
    IF v_new_cat_id IS NULL THEN
        INSERT INTO system_categorias (name, slug)
        VALUES ('Parâmetros', 'parametros') 
        RETURNING id INTO v_new_cat_id;
        RAISE NOTICE 'Categoria Parâmetros criada com ID %', v_new_cat_id;
    ELSE
        RAISE NOTICE 'Categoria Parâmetros já existe (ID %)', v_new_cat_id;
    END IF;

    -- 2. Mover Feature 'parametros' para nova categoria
    SELECT id INTO v_feature_id FROM system_features WHERE slug = 'parametros';
    
    IF v_feature_id IS NOT NULL THEN
        UPDATE system_features 
        SET category_id = v_new_cat_id, is_active = true 
        WHERE id = v_feature_id;
        RAISE NOTICE 'Feature parametros movida para Categoria %', v_new_cat_id;
    END IF;

    -- 3. Corrigir Ícone do Sidebar Item (Cog6ToothIcon -> cog)
    -- E garantir que está ativo
    UPDATE sidebar_menu_items
    SET icon_name = 'cog', is_active = true
    WHERE resource = 'parametros' AND parent_id IS NULL;

    -- 4. Garantir filho também está ativo
    UPDATE sidebar_menu_items
    SET is_active = true
    WHERE resource = 'parametros' AND parent_id IS NOT NULL;
    
    -- 5. Fallback: Atualizar roles de visualização da NOVA CATEGORIA?
    -- Tabelas system_categorias geralmente não tem roles, mas sidebar usa a categoria da feature.

END $$;

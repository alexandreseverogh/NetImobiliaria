-- Migração 041: Atribuir Feature ID ao item Pai 'Parâmetros'
-- Diagnóstico: A função get_sidebar_menu_for_user esconde itens com feature_id NULL.
-- O item Pai 'Parâmetros' (ID 46) está com feature_id NULL.
-- Solução: Atribuir feature_id = 54 (Parâmetros) a ele.

DO $$
DECLARE
    v_feature_id INTEGER;
    v_item_id INTEGER;
BEGIN
    -- 1. Obter Feature ID (54)
    SELECT id INTO v_feature_id FROM system_features WHERE slug = 'parametros';

    -- 2. Obter Item ID (Pai com resource 'parametros' ou ID 46)
    SELECT id INTO v_item_id FROM sidebar_menu_items WHERE resource = 'parametros';

    IF v_feature_id IS NOT NULL AND v_item_id IS NOT NULL THEN
        UPDATE sidebar_menu_items 
        SET feature_id = v_feature_id 
        WHERE id = v_item_id;
        
        RAISE NOTICE 'Item Sidebar % atualizado com Feature ID %', v_item_id, v_feature_id;
    END IF;
    
    -- Também garantir que o filho tenha feature_id (por precaução, embora o pai seja o bloqueio principal de visualização da pasta)
    UPDATE sidebar_menu_items 
    SET feature_id = v_feature_id 
    WHERE parent_id = v_item_id AND feature_id IS NULL;

END $$;

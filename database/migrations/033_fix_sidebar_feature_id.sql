-- Migração 033: Corrigir feature_id nulo no menu paramêtros
-- Isso é necessário pois a função de permissão esconde itens sem feature_id

DO $$
DECLARE
    v_feature_id INTEGER;
BEGIN
    -- 1. Obter ID da feature 'parametros'
    SELECT id INTO v_feature_id FROM system_features WHERE code = 'parametros';
    
    IF v_feature_id IS NOT NULL THEN
        -- 2. Atualizar itens de menu que usam resource 'parametros'
        UPDATE sidebar_menu_items
        SET feature_id = v_feature_id
        WHERE resource = 'parametros' 
          AND feature_id IS NULL;
          
        RAISE NOTICE 'Atualizados itens de menu com feature_id %', v_feature_id;
    ELSE
        RAISE NOTICE 'Feature parametros nao encontrada!';
    END IF;
END $$;

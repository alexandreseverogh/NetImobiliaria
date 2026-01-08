-- Migração 042: Consolidar Itens 'Parâmetros'
-- Problema: O usuário configurou um novo item (ID 52) que não tem permissões (feature_id/resource).
-- O item antigo (ID 46) tem permissões mas não está sendo usado.
-- Solução: Transferir identidade para o item novo e remover o antigo.

DO $$
DECLARE
    v_old_id INTEGER; -- O antigo "Real" (ID 46)
    v_new_id INTEGER; -- O novo "Ghost" configurado pelo usuário (ID 52)
    v_feature_id INTEGER;
BEGIN
    -- 1. Identificar IDs
    SELECT id INTO v_old_id FROM sidebar_menu_items WHERE resource = 'parametros' LIMIT 1;
    SELECT id INTO v_new_id FROM sidebar_menu_items WHERE name = 'Parâmetros' AND resource IS NULL LIMIT 1;

    -- 2. Identificar Feature ID
    SELECT id INTO v_feature_id FROM system_features WHERE slug = 'parametros';

    IF v_new_id IS NOT NULL THEN
        RAISE NOTICE 'Item Novo (Configurado pelo User) encontrado: %', v_new_id;

        -- Se existe um antigo conflictante, precisamos limpar
        IF v_old_id IS NOT NULL AND v_old_id <> v_new_id THEN
            RAISE NOTICE 'Item Antigo encontrado: %. Consolidando...', v_old_id;
            
            -- A. Mover filhos do antigo para o novo (se houver)
            UPDATE sidebar_menu_items SET parent_id = v_new_id WHERE parent_id = v_old_id;
            
            -- B. Remover antigo
            DELETE FROM sidebar_menu_items WHERE id = v_old_id;
        END IF;

        -- 3. Promover o Novo para "Real"
        UPDATE sidebar_menu_items 
        SET 
            resource = 'parametros',
            feature_id = v_feature_id,
            icon_name = 'cog',
            order_index = 2, -- Forçar posição abaixo do Painel do Sistema (que é 1)
            is_active = true
        WHERE id = v_new_id;

        RAISE NOTICE 'Item % promovido com sucesso. Resource=parametros, FeatureID=%, Order=2', v_new_id, v_feature_id;
    
    ELSE
        RAISE NOTICE 'Nenhum item novo sem resource encontrado. Verificando se o antigo já está correto...';
        
        -- Caso o usuário já tenha deletado o novo, garantimos que o antigo (se existir) esteja na ordem certa
        IF v_old_id IS NOT NULL THEN
            UPDATE sidebar_menu_items 
            SET order_index = 2, feature_id = v_feature_id 
            WHERE id = v_old_id;
            RAISE NOTICE 'Apenas atualizado item existente %', v_old_id;
        END IF;
    END IF;

END $$;

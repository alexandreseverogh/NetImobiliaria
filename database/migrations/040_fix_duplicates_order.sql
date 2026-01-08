-- Migração 040: Corrigir Duplicidade e Ordem de 'Parâmetros'
-- Encontrado item duplicado (ID 48) sem resource, ocupando a Ordem 2.
-- O item real (ID 46) com resource 'parametros' está na Ordem 13.
-- Objetivo: Remover ID 48 e promover ID 46 para a Ordem 2.

DO $$
DECLARE
    v_dup_id INTEGER;
    v_real_id INTEGER;
BEGIN
    -- 1. Identificar Duplicado (Resource NULL, Name Parâmetros) - baseado no dump ID 48
    SELECT id INTO v_dup_id FROM sidebar_menu_items 
    WHERE name = 'Parâmetros' AND resource IS NULL;

    -- 2. Identificar Real (Resource 'parametros') - baseado no dump ID 46
    SELECT id INTO v_real_id FROM sidebar_menu_items 
    WHERE resource = 'parametros';

    -- 3. Remover Duplicado
    IF v_dup_id IS NOT NULL THEN
        DELETE FROM sidebar_menu_items WHERE id = v_dup_id;
        RAISE NOTICE 'Item duplicado ID % removido.', v_dup_id;
    END IF;

    -- 4. Atualizar Ordem do Real para 2 (Logo após Painel do Sistema que é 1)
    IF v_real_id IS NOT NULL THEN
        UPDATE sidebar_menu_items 
        SET order_index = 2 
        WHERE id = v_real_id;
        
        RAISE NOTICE 'Item real ID % movido para Order 2.', v_real_id;
    END IF;

END $$;

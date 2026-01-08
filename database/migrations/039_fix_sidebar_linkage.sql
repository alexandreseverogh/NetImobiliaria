-- Migração 039: Corrigir Parent ID do item filho 'Parâmetros da Empresa'
-- O item filho ficou órfão (aparecendo no topo) porque referia-se a um ID de pai deletado.
-- Vamos relinká-lo ao novo pai 'Parâmetros'.

DO $$
DECLARE
    v_parent_id INTEGER;
    v_child_id INTEGER;
BEGIN
    -- 1. Buscar ID do Pai Atual (Criado na Migração 034/035/036/038)
    SELECT id INTO v_parent_id 
    FROM sidebar_menu_items 
    WHERE resource = 'parametros';

    -- 2. Buscar ID do Filho (Parâmetros da Empresa)
    -- Pode buscar por nome ou resource (no local dump não vimos resource dele, mas nome é seguro aqui)
    SELECT id INTO v_child_id 
    FROM sidebar_menu_items 
    WHERE name = 'Parâmetros da Empresa';

    IF v_parent_id IS NOT NULL AND v_child_id IS NOT NULL THEN
        -- 3. Atualizar o Pai do Filho
        UPDATE sidebar_menu_items 
        SET parent_id = v_parent_id 
        WHERE id = v_child_id;
        
        RAISE NOTICE 'Item Filho % relinkado ao Pai %', v_child_id, v_parent_id;
    ELSE
        RAISE NOTICE 'Nao foi possivel linkar: Pai=% Filho=%', v_parent_id, v_child_id;
    END IF;

    -- Opcional: Garantir que o filho esteja ATIVO
    IF v_child_id IS NOT NULL THEN
        UPDATE sidebar_menu_items SET is_active = true WHERE id = v_child_id;
    END IF;

END $$;

-- Migração 038: Alinhar Categoria de Parametros com Banco Local
-- O banco local usa Categoria 3 ('Administrativo') para a feature 'parametros'.
-- A categoria 'Parâmetros' (ID 8) não existe no local. Vamos reverter para garantir compatibilidade.

DO $$
DECLARE
    v_feature_id INTEGER;
    v_cat_admin_id INTEGER;
BEGIN
    -- 1. Obter feature ID
    SELECT id INTO v_feature_id FROM system_features WHERE slug = 'parametros';
    
    -- 2. Obter Categoria Administrativo (ID 3)
    SELECT id INTO v_cat_admin_id FROM system_categorias WHERE id = 3;

    IF v_feature_id IS NOT NULL AND v_cat_admin_id IS NOT NULL THEN
        -- Mover para Administrativo
        UPDATE system_features 
        SET category_id = v_cat_admin_id 
        WHERE id = v_feature_id;
        
        RAISE NOTICE 'Feature linkada à Categoria 3 (Administrativo) conforme banco local';
    END IF;

    -- 3. (Opcional) Poderíamos remover a categoria 8 criada, mas vamos mantê-la como "artefato" por enquanto para não quebrar chaves se algo mais tivesse sido linkado (improvável).

    -- 4. Re-garantir ícone 'cog' no sidebar (já feito na 036, mas reforçando)
    UPDATE sidebar_menu_items SET icon_name = 'cog' WHERE resource = 'parametros';

END $$;

DO $$ 
DECLARE 
    v_entity_id INTEGER;
BEGIN
    SELECT id INTO v_entity_id FROM public.system_metadata_entities WHERE name = 'lead';

    -- Atualizar com encoding correto (UTF-8)
    UPDATE public.system_metadata_fields 
    SET options = '[
        {"label": "Minha Casa Minha Vida", "value": "mcmv"},
        {"label": "SBPE / Banco Privado", "value": "sbpe"},
        {"label": "Recursos Próprios / À Vista", "value": "cash"},
        {"label": "Consórcio Contemplado", "value": "consorcio"}
    ]'::jsonb
    WHERE entity_id = v_entity_id AND field_name = 'perfil_financiamento';
END $$;

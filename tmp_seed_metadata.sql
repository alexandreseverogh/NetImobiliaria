DO $$ 
DECLARE 
    v_entity_id INTEGER;
BEGIN
    -- 1. Garantir que a entidade 'lead' existe
    INSERT INTO public.system_metadata_entities (name, description) 
    VALUES ('lead', 'Gestão de potenciais clientes e oportunidades') 
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO v_entity_id;

    -- 2. Inserir o campo customizado 'Perfil de Financiamento' para o segmento Imobiliária
    DELETE FROM public.system_metadata_fields 
    WHERE entity_id = v_entity_id AND segment = 'imobiliaria' AND field_name = 'perfil_financiamento';

    INSERT INTO public.system_metadata_fields (entity_id, segment, field_name, label, field_type, is_required, options, sort_order)
    VALUES (
        v_entity_id, 
        'imobiliaria', 
        'perfil_financiamento', 
        'Perfil de Financiamento', 
        'select', 
        true, 
        '[
            {"label": "Minha Casa Minha Vida", "value": "mcmv"},
            {"label": "SBPE / Banco Privado", "value": "sbpe"},
            {"label": "Recursos Próprios / À Vista", "value": "cash"},
            {"label": "Consórcio Contemplado", "value": "consorcio"}
        ]'::jsonb,
        10
    );
END $$;

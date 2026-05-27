DO $$ 
DECLARE
    t_name text;
    tables_to_modify text[] := ARRAY[
        'user_roles', 'clientes', 'crm_segmentos_config', 'kanban_colunas',
        'leads_kanban', 'leads_kanban_ciclos', 'leads_staging', 'leads_staging_atribuicoes',
        'consentimentos_lead', 'proprietarios', 'marketing_campanhas_orcamento', 'marketing_eventos',
        'imoveis', 'imovel_amenidades', 'imovel_documentos', 'imovel_imagens', 'imovel_video',
        'imovel_prospect_atribuicoes', 'imovel_prospects', 'imovel_proximidades', 'imovel_rascunho',
        'imovel_visitas', 'documento_imovel', 'corretor_areas_atuacao', 'corretor_scores',
        'status_imovel', 'tipo_documento_imovel', 'finalidades_imovel', 'financiadores',
        'tipos_imovel', 'audit_logs', 'email_settings', 'email_templates'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_to_modify
    LOOP
        -- First verify if table exists
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t_name) THEN
            -- Add column if it does not exist
            IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t_name AND column_name = 'tenant_id') THEN
                EXECUTE format('ALTER TABLE public.%I ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE', t_name);
                RAISE NOTICE 'Added tenant_id to %', t_name;
            ELSE
                RAISE NOTICE 'Skipping %: tenant_id already exists', t_name;
            END IF;
        ELSE
            RAISE NOTICE 'Table % does not exist in public schema', t_name;
        END IF;
    END LOOP;
END $$;

-- Criação da tabela de Árvore de Papéis (Organograma - Opção B)
CREATE TABLE IF NOT EXISTS public.role_hierarchies (
    id SERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    manager_role_id INTEGER REFERENCES public.user_roles(id) ON DELETE CASCADE NOT NULL,
    subordinate_role_id INTEGER REFERENCES public.user_roles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Um subordinado só pode responder a um determinado gerente uma única vez (evita duplicidade de linha)
    UNIQUE (tenant_id, manager_role_id, subordinate_role_id),
    -- Regra de negócio: não é possível subordinação a si mesmo
    CHECK (manager_role_id != subordinate_role_id)
);

-- Indexação para ganho de performance (usaremos isso intensivamente nos check de acessos)
CREATE INDEX IF NOT EXISTS idx_role_hierarchies_manager ON public.role_hierarchies(manager_role_id);
CREATE INDEX IF NOT EXISTS idx_role_hierarchies_subordinate ON public.role_hierarchies(subordinate_role_id);

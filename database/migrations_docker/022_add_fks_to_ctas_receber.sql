-- 022_add_fks_to_ctas_receber.sql
-- Adiciona campos corretor_fk e imovel_fk à tabela ctas_receber

DO $$
BEGIN
    -- Adicionar corretor_fk
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ctas_receber' AND column_name = 'corretor_fk') THEN
        ALTER TABLE public.ctas_receber ADD COLUMN corretor_fk UUID;
        
        -- Criar foreign key para users (corretor)
        ALTER TABLE public.ctas_receber 
            ADD CONSTRAINT fk_ctas_receber_corretor 
            FOREIGN KEY (corretor_fk) REFERENCES public.users(id) ON DELETE SET NULL;
        
        -- Criar índice
        CREATE INDEX idx_ctas_receber_corretor_fk ON public.ctas_receber(corretor_fk);
        
        -- Adicionar comentário
        COMMENT ON COLUMN public.ctas_receber.corretor_fk IS 'Referência ao corretor (users)';
        
        RAISE NOTICE 'Coluna corretor_fk adicionada à tabela ctas_receber.';
    ELSE
        RAISE NOTICE 'Coluna corretor_fk já existe na tabela ctas_receber.';
    END IF;

    -- Adicionar imovel_fk
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ctas_receber' AND column_name = 'imovel_fk') THEN
        ALTER TABLE public.ctas_receber ADD COLUMN imovel_fk INTEGER;
        
        -- Criar foreign key para imoveis
        ALTER TABLE public.ctas_receber 
            ADD CONSTRAINT fk_ctas_receber_imovel 
            FOREIGN KEY (imovel_fk) REFERENCES public.imoveis(id) ON DELETE SET NULL;
        
        -- Criar índice
        CREATE INDEX idx_ctas_receber_imovel_fk ON public.ctas_receber(imovel_fk);
        
        -- Adicionar comentário
        COMMENT ON COLUMN public.ctas_receber.imovel_fk IS 'Referência ao imóvel';
        
        RAISE NOTICE 'Coluna imovel_fk adicionada à tabela ctas_receber.';
    ELSE
        RAISE NOTICE 'Coluna imovel_fk já existe na tabela ctas_receber.';
    END IF;
END $$;


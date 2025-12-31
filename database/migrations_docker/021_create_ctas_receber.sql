-- 021_create_ctas_receber.sql
-- Cria tabela de contas a receber

DO $$
BEGIN
    -- Criar tabela ctas_receber se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ctas_receber') THEN
        CREATE TABLE public.ctas_receber (
            id SERIAL PRIMARY KEY,
            tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('imovel', 'des_local', 'des_nac', 'locador')),
            valor NUMERIC(12,2) NOT NULL DEFAULT 0.00,
            data_pagto DATE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            created_by UUID,
            CONSTRAINT fk_ctas_receber_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL
        );
        
        -- Criar índices para melhor performance
        CREATE INDEX idx_ctas_receber_tipo ON public.ctas_receber(tipo);
        CREATE INDEX idx_ctas_receber_data_pagto ON public.ctas_receber(data_pagto);
        CREATE INDEX idx_ctas_receber_created_by ON public.ctas_receber(created_by);
        CREATE INDEX idx_ctas_receber_created_at ON public.ctas_receber(created_at);
        
        RAISE NOTICE 'Tabela ctas_receber criada com sucesso.';
    ELSE
        RAISE NOTICE 'Tabela ctas_receber já existe.';
    END IF;
END $$;



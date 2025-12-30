-- 012_create_corretor_areas_atuacao.sql
-- Cria a tabela Corretor_Areas_Atuacao conforme solicitado pelo usuário.

CREATE TABLE IF NOT EXISTS public.corretor_areas_atuacao (
    id          BIGSERIAL PRIMARY KEY,
    corretor_fk UUID NOT NULL,
    estado_fk   CHAR(2) NOT NULL,
    cidade_fk   VARCHAR(100) NOT NULL,
    created_at  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by  UUID,
    updated_at  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Adicionando chaves estrangeiras
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_corretor_areas_atuacao_corretor_fk'
    ) THEN
        ALTER TABLE public.corretor_areas_atuacao
            ADD CONSTRAINT fk_corretor_areas_atuacao_corretor_fk
            FOREIGN KEY (corretor_fk)
            REFERENCES public.users(id)
            ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_corretor_areas_atuacao_created_by'
    ) THEN
        ALTER TABLE public.corretor_areas_atuacao
            ADD CONSTRAINT fk_corretor_areas_atuacao_created_by
            FOREIGN KEY (created_by)
            REFERENCES public.users(id)
            ON DELETE SET NULL;
    END IF;

    -- Unicidade para evitar duplicidade de área para o mesmo corretor
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_corretor_areas_atuacao_area'
    ) THEN
        ALTER TABLE public.corretor_areas_atuacao
            ADD CONSTRAINT uq_corretor_areas_atuacao_area
            UNIQUE (corretor_fk, estado_fk, cidade_fk);
    END IF;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_corretor_areas_atuacao_corretor_fk 
    ON public.corretor_areas_atuacao (corretor_fk);

CREATE INDEX IF NOT EXISTS idx_corretor_areas_atuacao_estado_cidade 
    ON public.corretor_areas_atuacao (estado_fk, cidade_fk);

-- Trigger para atualizar o updated_at automaticamente
CREATE OR REPLACE TRIGGER update_corretor_areas_atuacao_updated_at
    BEFORE UPDATE ON public.corretor_areas_atuacao
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


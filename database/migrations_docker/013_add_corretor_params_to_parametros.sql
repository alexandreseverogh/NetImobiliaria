-- 013_add_corretor_params_to_parametros.sql
-- Adiciona campos de valor e chave PIX do corretor na tabela de parâmetros.

-- Adicionar valor_corretor
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'parametros' AND column_name = 'valor_corretor'
    ) THEN
        ALTER TABLE public.parametros ADD COLUMN valor_corretor NUMERIC(12,2) DEFAULT 0.00;
    END IF;
END $$;

-- Adicionar chave_pix_corretor
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'parametros' AND column_name = 'chave_pix_corretor'
    ) THEN
        ALTER TABLE public.parametros ADD COLUMN chave_pix_corretor VARCHAR(255);
    END IF;
END $$;

-- Garantir que exista pelo menos uma linha na tabela de parâmetros se estiver vazia
INSERT INTO public.parametros (vl_destaque_nacional, valor_corretor, chave_pix_corretor)
SELECT 0.00, 0.00, ''
WHERE NOT EXISTS (SELECT 1 FROM public.parametros);


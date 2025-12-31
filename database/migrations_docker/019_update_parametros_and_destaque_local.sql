-- 019_update_parametros_and_destaque_local.sql
-- 1. Remover o campo valor_mensal da tabela valor_destaque_local
-- 2. Adicionar o campo valor_mensal_imovel na tabela parametros

DO $$
BEGIN
    -- 1. Remover campo valor_mensal de valor_destaque_local se existir
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'valor_destaque_local' AND column_name = 'valor_mensal') THEN
        ALTER TABLE public.valor_destaque_local DROP COLUMN valor_mensal;
        RAISE NOTICE 'Coluna valor_mensal removida da tabela valor_destaque_local.';
    END IF;

    -- 2. Adicionar campo valor_mensal_imovel em parametros se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parametros' AND column_name = 'valor_mensal_imovel') THEN
        ALTER TABLE public.parametros ADD COLUMN valor_mensal_imovel NUMERIC(8,2) NOT NULL DEFAULT 0.00;
        RAISE NOTICE 'Coluna valor_mensal_imovel adicionada à tabela parametros.';
    END IF;
END $$;



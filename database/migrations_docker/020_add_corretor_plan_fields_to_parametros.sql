-- 020_add_corretor_plan_fields_to_parametros.sql
-- Adiciona campos para o plano de corretor (quantidade de anúncios e período)

DO $$
BEGIN
    -- Adicionar qtde_anuncios_imoveis_corretor
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parametros' AND column_name = 'qtde_anuncios_imoveis_corretor') THEN
        ALTER TABLE public.parametros ADD COLUMN qtde_anuncios_imoveis_corretor INTEGER NOT NULL DEFAULT 5;
        RAISE NOTICE 'Coluna qtde_anuncios_imoveis_corretor adicionada à tabela parametros.';
    END IF;

    -- Adicionar periodo_anuncio_corretor (em dias)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parametros' AND column_name = 'periodo_anuncio_corretor') THEN
        ALTER TABLE public.parametros ADD COLUMN periodo_anuncio_corretor INTEGER NOT NULL DEFAULT 30;
        RAISE NOTICE 'Coluna periodo_anuncio_corretor adicionada à tabela parametros.';
    END IF;
END $$;



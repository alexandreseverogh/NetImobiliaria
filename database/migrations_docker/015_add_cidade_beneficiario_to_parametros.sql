-- 015_add_cidade_beneficiario_to_parametros.sql
-- Adiciona o campo cidade_beneficiario_recebimento_corretor na tabela de parâmetros.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'parametros' AND column_name = 'cidade_beneficiario_recebimento_corretor'
    ) THEN
        ALTER TABLE public.parametros ADD COLUMN cidade_beneficiario_recebimento_corretor VARCHAR(100) DEFAULT 'BRASILIA';
    END IF;
END $$;


-- Migration: Adicionar campo destaque_nacional na tabela imoveis
-- Data: 2025-11-15
-- Descrição: Adiciona campo boolean destaque_nacional e atualiza todos os registros para true

-- PASSO 1: Verificar se a coluna já existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'imoveis' 
        AND column_name = 'destaque_nacional'
    ) THEN
        -- Adicionar coluna destaque_nacional
        ALTER TABLE imoveis 
        ADD COLUMN destaque_nacional BOOLEAN DEFAULT false NOT NULL;
        
        RAISE NOTICE 'Coluna destaque_nacional criada com sucesso';
    ELSE
        RAISE NOTICE 'Coluna destaque_nacional já existe';
    END IF;
END $$;

-- PASSO 2: Atualizar todos os registros existentes para destaque_nacional = true
UPDATE imoveis 
SET destaque_nacional = true 
WHERE destaque_nacional = false;

-- PASSO 3: Adicionar comentário na coluna (se não existir)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'imoveis' 
        AND column_name = 'destaque_nacional'
    ) THEN
        COMMENT ON COLUMN imoveis.destaque_nacional IS 'Indica se o imóvel está em destaque nacional (exibido quando não há matches locais)';
    END IF;
END $$;

-- PASSO 4: Verificar resultado
SELECT 
  COUNT(*) as total_imoveis,
  COUNT(*) FILTER (WHERE destaque_nacional = true) as com_destaque_nacional,
  COUNT(*) FILTER (WHERE destaque_nacional = false) as sem_destaque_nacional
FROM imoveis;


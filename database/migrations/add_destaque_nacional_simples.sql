-- Migration SIMPLIFICADA: Adicionar campo destaque_nacional na tabela imoveis
-- Execute este arquivo se o arquivo principal der erro

-- Adicionar coluna destaque_nacional (sem IF NOT EXISTS para garantir execução)
ALTER TABLE imoveis 
ADD COLUMN destaque_nacional BOOLEAN DEFAULT false NOT NULL;

-- Atualizar todos os registros existentes para destaque_nacional = true
UPDATE imoveis 
SET destaque_nacional = true;

-- Adicionar comentário na coluna
COMMENT ON COLUMN imoveis.destaque_nacional IS 'Indica se o imóvel está em destaque nacional (exibido quando não há matches locais)';










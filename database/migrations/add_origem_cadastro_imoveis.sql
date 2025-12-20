-- Migration: Adicionar campo origem_cadastro na tabela imoveis
-- Data: 2025-01-XX
-- Descrição: Adiciona campo para rastrear se o imóvel foi cadastrado via acesso público ou admin

-- Adicionar coluna origem_cadastro
ALTER TABLE imoveis 
ADD COLUMN IF NOT EXISTS origem_cadastro VARCHAR(20) DEFAULT NULL;

-- Adicionar comentário na coluna
COMMENT ON COLUMN imoveis.origem_cadastro IS 'Origem do cadastro: "Publico" ou "Admin"';

-- Criar índice para melhorar performance em consultas por origem
CREATE INDEX IF NOT EXISTS idx_imoveis_origem_cadastro ON imoveis(origem_cadastro);

-- Atualizar registros existentes para 'Admin' (assumindo que foram criados via admin)
UPDATE imoveis 
SET origem_cadastro = 'Admin' 
WHERE origem_cadastro IS NULL;










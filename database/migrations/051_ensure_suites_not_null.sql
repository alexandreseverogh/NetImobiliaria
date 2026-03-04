-- Migration 051: Garantir que o campo suites na tabela imoveis nunca seja nulo
-- Propósito: Definir valor padrão 0 e restrição NOT NULL para a coluna suites

-- Primeiro, atualizar registros nulos existentes para 0
UPDATE imoveis SET suites = 0 WHERE suites IS NULL;

-- Alterar a coluna para adicionar o valor padrão e a restrição NOT NULL
ALTER TABLE imoveis 
ALTER COLUMN suites SET DEFAULT 0,
ALTER COLUMN suites SET NOT NULL;

-- ================================================================
-- Script: Adicionar campo origem_cadastro
-- Descricao: Adiciona campo para identificar a origem do cadastro
-- Data: 2025-11-06
-- ================================================================

BEGIN;

-- Adicionar coluna em clientes
ALTER TABLE clientes 
  ADD COLUMN IF NOT EXISTS origem_cadastro VARCHAR(20) DEFAULT 'Plataforma'
  CHECK (origem_cadastro IN ('Publico', 'Plataforma'));

-- Adicionar coluna em proprietarios
ALTER TABLE proprietarios 
  ADD COLUMN IF NOT EXISTS origem_cadastro VARCHAR(20) DEFAULT 'Plataforma'
  CHECK (origem_cadastro IN ('Publico', 'Plataforma'));

-- Criar indices para performance
CREATE INDEX IF NOT EXISTS idx_clientes_origem_cadastro ON clientes(origem_cadastro);
CREATE INDEX IF NOT EXISTS idx_proprietarios_origem_cadastro ON proprietarios(origem_cadastro);

-- Adicionar comentarios
COMMENT ON COLUMN clientes.origem_cadastro IS 'Origem do cadastro: Publico (site) ou Plataforma (admin)';
COMMENT ON COLUMN proprietarios.origem_cadastro IS 'Origem do cadastro: Publico (site) ou Plataforma (admin)';

-- Atualizar registros existentes para 'Plataforma'
UPDATE clientes SET origem_cadastro = 'Plataforma' WHERE origem_cadastro IS NULL;
UPDATE proprietarios SET origem_cadastro = 'Plataforma' WHERE origem_cadastro IS NULL;

COMMIT;

-- Verificar
SELECT 'Campo origem_cadastro adicionado com sucesso!';
SELECT 'Clientes atualizados:', COUNT(*) FROM clientes WHERE origem_cadastro = 'Plataforma';
SELECT 'Proprietarios atualizados:', COUNT(*) FROM proprietarios WHERE origem_cadastro = 'Plataforma';



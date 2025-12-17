-- ============================================
-- Migration: Adicionar campo valor_mensal em valor_destaque_local
-- Data: 2025-01-XX
-- Descrição: Adiciona campo valor_mensal para armazenar valor mensal de destaque por estado
-- ============================================

-- Adicionar coluna valor_mensal na tabela valor_destaque_local
ALTER TABLE valor_destaque_local 
ADD COLUMN IF NOT EXISTS valor_mensal NUMERIC(8,2) DEFAULT 0.00;

-- Atualizar valores existentes para garantir que não sejam NULL
UPDATE valor_destaque_local 
SET valor_mensal = 0.00 
WHERE valor_mensal IS NULL;

-- Tornar a coluna NOT NULL após popular valores existentes
ALTER TABLE valor_destaque_local 
ALTER COLUMN valor_mensal SET NOT NULL;

-- Adicionar comentário na coluna
COMMENT ON COLUMN valor_destaque_local.valor_mensal IS 'Valor mensal de destaque por estado (NUMERIC 8,2)';

-- Verificar estrutura da tabela
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'valor_destaque_local' 
  AND column_name IN ('valor_destaque', 'valor_mensal')
ORDER BY ordinal_position;


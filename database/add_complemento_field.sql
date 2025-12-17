-- ================================================================
-- SCRIPT: Adicionar Campo Complemento em Clientes e Proprietarios
-- Sistema: Net Imobiliaria
-- Data: 05/11/2025
-- ================================================================

-- Adicionar campo complemento na tabela clientes
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);

-- Adicionar campo complemento na tabela proprietarios
ALTER TABLE proprietarios 
ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);

-- Adicionar comentarios
COMMENT ON COLUMN clientes.complemento IS 'Complemento do endereco (apartamento, bloco, etc)';
COMMENT ON COLUMN proprietarios.complemento IS 'Complemento do endereco (apartamento, bloco, etc)';

-- Verificacao
SELECT 'clientes' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'clientes' AND column_name = 'complemento'
UNION ALL
SELECT 'proprietarios' as tabela, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'proprietarios' AND column_name = 'complemento';



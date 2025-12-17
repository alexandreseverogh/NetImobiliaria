-- Adicionar campos faltantes na tabela imoveis

-- 1. Adicionar campos de endereço
ALTER TABLE imoveis 
ADD COLUMN IF NOT EXISTS numero VARCHAR(20);

ALTER TABLE imoveis 
ADD COLUMN IF NOT EXISTS complemento VARCHAR(100);

-- 2. Adicionar campo taxa_extra
ALTER TABLE imoveis 
ADD COLUMN IF NOT EXISTS taxa_extra DECIMAL(8,2);

-- 3. Verificar se as colunas foram adicionadas
\d imoveis;

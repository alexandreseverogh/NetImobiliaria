-- Adicionar campo visivel_publico na tabela status_imovel
ALTER TABLE status_imovel 
ADD COLUMN visivel_publico BOOLEAN DEFAULT true;

-- Comentário para documentar o campo
COMMENT ON COLUMN status_imovel.visivel_publico IS 'Indica se o status é visível para o público geral';

-- Atualizar registros existentes para serem visíveis por padrão
UPDATE status_imovel 
SET visivel_publico = true 
WHERE visivel_publico IS NULL;


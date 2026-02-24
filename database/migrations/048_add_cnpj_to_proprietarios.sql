-- Adicionar coluna cnpj à tabela proprietarios
-- Garantir que a coluna CPF possa ser nula agora, já que são excludentes
ALTER TABLE proprietarios ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);
ALTER TABLE proprietarios ALTER COLUMN cpf DROP NOT NULL;

-- Comentário para documentação
COMMENT ON COLUMN proprietarios.cnpj IS 'CNPJ do proprietário (excludente com CPF)';
COMMENT ON COLUMN proprietarios.cpf IS 'CPF do proprietário (excludente com CNPJ)';

-- Adicionar índice para busca por CNPJ
CREATE INDEX IF NOT EXISTS idx_proprietarios_cnpj ON proprietarios(cnpj);

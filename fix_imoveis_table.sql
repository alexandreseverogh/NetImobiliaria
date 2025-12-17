-- Script para corrigir a tabela imoveis
-- Execute este script no PostgreSQL

-- Adicionar colunas que podem estar faltando
ALTER TABLE imoveis 
ADD COLUMN IF NOT EXISTS tipo_fk INTEGER REFERENCES tipos_imovel(id);

ALTER TABLE imoveis 
ADD COLUMN IF NOT EXISTS finalidade_fk INTEGER REFERENCES finalidades_imovel(id);

ALTER TABLE imoveis 
ADD COLUMN IF NOT EXISTS status_fk INTEGER REFERENCES status_imovel(id);

-- Renomear colunas de localização se necessário
ALTER TABLE imoveis 
RENAME COLUMN IF EXISTS cidade TO cidade_fk;

ALTER TABLE imoveis 
RENAME COLUMN IF EXISTS estado TO estado_fk;

-- Ou adicionar se não existirem
ALTER TABLE imoveis 
ADD COLUMN IF NOT EXISTS cidade_fk VARCHAR(100);

ALTER TABLE imoveis 
ADD COLUMN IF NOT EXISTS estado_fk CHAR(2);

-- Remover colunas de proprietário se existirem
ALTER TABLE imoveis 
DROP COLUMN IF EXISTS proprietario_nome;

ALTER TABLE imoveis 
DROP COLUMN IF EXISTS proprietario_telefone;

ALTER TABLE imoveis 
DROP COLUMN IF EXISTS proprietario_email;

-- Verificar se as colunas foram adicionadas
\d imoveis;

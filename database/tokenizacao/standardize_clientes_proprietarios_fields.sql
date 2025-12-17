-- Padronizar campos estado_fk e cidade_fk para VARCHAR(100) nas tabelas clientes e proprietarios
-- Net Imobiliária - Sistema de Gestão

-- 1. Alterar tipo dos campos estado_fk e cidade_fk para VARCHAR(100)
ALTER TABLE clientes 
ALTER COLUMN estado_fk TYPE VARCHAR(100),
ALTER COLUMN cidade_fk TYPE VARCHAR(100);

ALTER TABLE proprietarios 
ALTER COLUMN estado_fk TYPE VARCHAR(100),
ALTER COLUMN cidade_fk TYPE VARCHAR(100);

-- 2. Migrar dados de estado_nome e cidade_nome para estado_fk e cidade_fk
UPDATE clientes 
SET estado_fk = estado_nome, 
    cidade_fk = cidade_nome 
WHERE estado_nome IS NOT NULL OR cidade_nome IS NOT NULL;

UPDATE proprietarios 
SET estado_fk = estado_nome, 
    cidade_fk = cidade_nome 
WHERE estado_nome IS NOT NULL OR cidade_nome IS NOT NULL;

-- 3. Deletar colunas estado_nome e cidade_nome
ALTER TABLE clientes 
DROP COLUMN estado_nome,
DROP COLUMN cidade_nome;

ALTER TABLE proprietarios 
DROP COLUMN estado_nome,
DROP COLUMN cidade_nome;

-- Comentário: Após essas alterações, os campos estado_fk e cidade_fk
-- conterão os nomes dos estados e cidades diretamente, seguindo o padrão da tabela imoveis


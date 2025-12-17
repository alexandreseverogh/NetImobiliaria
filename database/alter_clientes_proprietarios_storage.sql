-- Alterar tabelas para armazenar nomes de estado e cidade em vez de códigos
-- Net Imobiliária - Sistema de Gestão

-- Adicionar colunas para nomes de estado e cidade na tabela clientes
ALTER TABLE clientes 
ADD COLUMN estado_nome VARCHAR(100),
ADD COLUMN cidade_nome VARCHAR(100);

-- Adicionar colunas para nomes de estado e cidade na tabela proprietarios  
ALTER TABLE proprietarios
ADD COLUMN estado_nome VARCHAR(100),
ADD COLUMN cidade_nome VARCHAR(100);

-- Atualizar dados existentes com nomes baseados nos códigos atuais
-- (Esta parte será feita via aplicação para garantir consistência com o JSON)

-- Comentário: As colunas estado_fk e cidade_fk serão mantidas temporariamente
-- para migração dos dados existentes, depois podem ser removidas









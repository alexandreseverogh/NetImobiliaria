-- Script para migrar dados existentes e popular os campos estado_nome e cidade_nome
-- Net Imobiliária - Sistema de Gestão

-- Atualizar clientes existentes com nomes baseados nos códigos atuais
-- (Este script será executado via aplicação para garantir consistência com o JSON)

-- Exemplo de como seria a migração (será feita via aplicação):
-- UPDATE clientes SET 
--   estado_nome = 'Pernambuco',
--   cidade_nome = 'Recife'
-- WHERE estado_fk = 0 AND cidade_fk = 0;

-- UPDATE clientes SET 
--   estado_nome = 'São Paulo',
--   cidade_nome = 'São Paulo'
-- WHERE estado_fk = 1 AND cidade_fk = 1;

-- Comentário: A migração real será feita via aplicação para garantir
-- que os nomes correspondam exatamente aos dados do JSON municipios.json


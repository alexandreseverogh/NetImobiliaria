-- Renomear tabela documento_imovel para imovel_documentos

-- 1. Renomear a tabela
ALTER TABLE documento_imovel RENAME TO imovel_documentos;

-- 2. Verificar se a tabela foi renomeada
\dt imovel_documentos;

-- 3. Verificar estrutura da nova tabela
\d imovel_documentos;

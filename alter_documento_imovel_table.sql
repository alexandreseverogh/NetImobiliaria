-- Alterar tabela documento_imovel conforme solicitado

-- 1. Renomear coluna id_imovel para imovel_fk
ALTER TABLE documento_imovel 
RENAME COLUMN id_imovel TO imovel_fk;

-- 2. Adicionar colunas created_by e updated_by
ALTER TABLE documento_imovel 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

ALTER TABLE documento_imovel 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- 3. Atualizar constraint UNIQUE para usar imovel_fk
ALTER TABLE documento_imovel 
DROP CONSTRAINT IF EXISTS documento_imovel_id_tipo_documento_id_imovel_key;

ALTER TABLE documento_imovel 
ADD CONSTRAINT documento_imovel_id_tipo_documento_imovel_fk_key 
UNIQUE(id_tipo_documento, imovel_fk);

-- Verificar estrutura da tabela
\d documento_imovel;

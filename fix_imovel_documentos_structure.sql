-- Corrigir estrutura da tabela imovel_documentos

-- 1. Deletar tabela imovel_documentos atual (estrutura incorreta)
DROP TABLE IF EXISTS imovel_documentos CASCADE;

-- 2. Criar tabela imovel_documentos com estrutura correta (baseada no backup)
CREATE TABLE imovel_documentos (
    id SERIAL PRIMARY KEY,
    id_tipo_documento INTEGER NOT NULL REFERENCES tipo_documento_imovel(id),
    id_imovel INTEGER NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    documento BYTEA NOT NULL,
    nome_arquivo VARCHAR(255) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_tipo_documento, id_imovel)
);

-- 3. Verificar estrutura da nova tabela
\d imovel_documentos;

-- 4. Verificar se documento_imovel ainda existe
\dt documento_imovel;

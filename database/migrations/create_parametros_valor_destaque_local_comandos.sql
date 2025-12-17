-- =====================================================
-- INSTRUÇÕES: Execute os comandos abaixo UM POR VEZ
-- Copie e cole cada comando individualmente no pgAdmin
-- =====================================================

-- COMANDO 1: Remover tabelas antigas (execute primeiro)
DROP TABLE IF EXISTS "Valor_Destaque_Local" CASCADE;
DROP TABLE IF EXISTS valor_destaque_local CASCADE;
DROP TABLE IF EXISTS "Parametros" CASCADE;
DROP TABLE IF EXISTS parametros CASCADE;

-- COMANDO 2: Remover função e trigger antigos
DROP TRIGGER IF EXISTS trigger_update_valor_destaque_local_updated_at ON valor_destaque_local;
DROP FUNCTION IF EXISTS update_valor_destaque_local_updated_at() CASCADE;

-- COMANDO 3: Remover índices antigos
DROP INDEX IF EXISTS idx_valor_destaque_local_estado_cidade;
DROP INDEX IF EXISTS idx_valor_destaque_local_cidade;
DROP INDEX IF EXISTS idx_valor_destaque_local_estado;

-- COMANDO 4: Criar tabela parametros
CREATE TABLE parametros (
    vl_destaque_nacional NUMERIC(8,2) NOT NULL DEFAULT 0.00
);

-- COMANDO 5: Adicionar comentários na tabela parametros
COMMENT ON TABLE parametros IS 'Tabela para armazenar parâmetros gerais do sistema';
COMMENT ON COLUMN parametros.vl_destaque_nacional IS 'Valor do destaque nacional (NUMERIC 8,2)';

-- COMANDO 6: Inserir registro inicial em parametros
INSERT INTO parametros (vl_destaque_nacional) VALUES (0.00);

-- COMANDO 7: Criar tabela valor_destaque_local
CREATE TABLE valor_destaque_local (
    id SERIAL PRIMARY KEY,
    estado_fk VARCHAR(2) NOT NULL,
    cidade_fk VARCHAR(100) NOT NULL,
    valor_destaque NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(estado_fk, cidade_fk)
);

-- COMANDO 8: Criar índices na tabela valor_destaque_local
CREATE INDEX idx_valor_destaque_local_estado ON valor_destaque_local(estado_fk);
CREATE INDEX idx_valor_destaque_local_cidade ON valor_destaque_local(cidade_fk);
CREATE INDEX idx_valor_destaque_local_estado_cidade ON valor_destaque_local(estado_fk, cidade_fk);

-- COMANDO 9: Adicionar comentários na tabela valor_destaque_local
COMMENT ON TABLE valor_destaque_local IS 'Tabela para armazenar valores de destaque por localização (estado e cidade)';
COMMENT ON COLUMN valor_destaque_local.id IS 'Chave primária auto incremento';
COMMENT ON COLUMN valor_destaque_local.estado_fk IS 'Sigla do estado (VARCHAR(2)) - FK para estados';
COMMENT ON COLUMN valor_destaque_local.cidade_fk IS 'Nome da cidade (VARCHAR(100)) - FK para cidades';
COMMENT ON COLUMN valor_destaque_local.valor_destaque IS 'Valor do destaque local (NUMERIC 8,2)';
COMMENT ON COLUMN valor_destaque_local.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN valor_destaque_local.updated_at IS 'Data e hora da última atualização do registro';

-- COMANDO 10: Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_valor_destaque_local_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- COMANDO 11: Criar trigger para atualizar updated_at automaticamente
CREATE TRIGGER trigger_update_valor_destaque_local_updated_at
    BEFORE UPDATE ON valor_destaque_local
    FOR EACH ROW
    EXECUTE FUNCTION update_valor_destaque_local_updated_at();

-- COMANDO 12: Verificar se as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('parametros', 'valor_destaque_local')
ORDER BY table_name;


-- Migration FINAL SIMPLIFICADA: Criar tabelas Parametros e Valor_Destaque_Local
-- Versão sem blocos DO para evitar problemas de sintaxe
-- Execute este script completo no pgAdmin

-- =====================================================
-- PASSO 1: Remover objetos antigos
-- =====================================================

DROP TABLE IF EXISTS "Valor_Destaque_Local" CASCADE;
DROP TABLE IF EXISTS valor_destaque_local CASCADE;
DROP TABLE IF EXISTS "Parametros" CASCADE;
DROP TABLE IF EXISTS parametros CASCADE;

DROP TRIGGER IF EXISTS trigger_update_valor_destaque_local_updated_at ON valor_destaque_local;
DROP FUNCTION IF EXISTS update_valor_destaque_local_updated_at() CASCADE;

DROP INDEX IF EXISTS idx_valor_destaque_local_estado_cidade;
DROP INDEX IF EXISTS idx_valor_destaque_local_cidade;
DROP INDEX IF EXISTS idx_valor_destaque_local_estado;

-- =====================================================
-- PASSO 2: Criar tabela parametros
-- =====================================================

CREATE TABLE parametros (
    vl_destaque_nacional NUMERIC(8,2) NOT NULL DEFAULT 0.00
);

COMMENT ON TABLE parametros IS 'Tabela para armazenar parâmetros gerais do sistema';
COMMENT ON COLUMN parametros.vl_destaque_nacional IS 'Valor do destaque nacional (NUMERIC 8,2)';

INSERT INTO parametros (vl_destaque_nacional) VALUES (0.00);

-- =====================================================
-- PASSO 3: Criar tabela valor_destaque_local
-- =====================================================

CREATE TABLE valor_destaque_local (
    id SERIAL PRIMARY KEY,
    estado_fk VARCHAR(2) NOT NULL,
    cidade_fk VARCHAR(100) NOT NULL,
    valor_destaque NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(estado_fk, cidade_fk)
);

CREATE INDEX idx_valor_destaque_local_estado ON valor_destaque_local(estado_fk);
CREATE INDEX idx_valor_destaque_local_cidade ON valor_destaque_local(cidade_fk);
CREATE INDEX idx_valor_destaque_local_estado_cidade ON valor_destaque_local(estado_fk, cidade_fk);

COMMENT ON TABLE valor_destaque_local IS 'Tabela para armazenar valores de destaque por localização (estado e cidade)';
COMMENT ON COLUMN valor_destaque_local.id IS 'Chave primária auto incremento';
COMMENT ON COLUMN valor_destaque_local.estado_fk IS 'Sigla do estado (VARCHAR(2)) - FK para estados';
COMMENT ON COLUMN valor_destaque_local.cidade_fk IS 'Nome da cidade (VARCHAR(100)) - FK para cidades';
COMMENT ON COLUMN valor_destaque_local.valor_destaque IS 'Valor do destaque local (NUMERIC 8,2)';
COMMENT ON COLUMN valor_destaque_local.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN valor_destaque_local.updated_at IS 'Data e hora da última atualização do registro';

-- =====================================================
-- PASSO 4: Criar função para atualizar updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_valor_destaque_local_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- =====================================================
-- PASSO 5: Criar trigger
-- =====================================================

CREATE TRIGGER trigger_update_valor_destaque_local_updated_at
    BEFORE UPDATE ON valor_destaque_local
    FOR EACH ROW
    EXECUTE FUNCTION update_valor_destaque_local_updated_at();

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================

SELECT 
    table_name as tabela,
    'CRIADA COM SUCESSO' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('parametros', 'valor_destaque_local')
ORDER BY table_name;


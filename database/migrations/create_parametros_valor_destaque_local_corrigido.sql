-- Migration CORRIGIDA: Criar tabelas Parametros e Valor_Destaque_Local
-- Data: 2025-01-XX
-- Descrição: Versão corrigida usando nomes em minúsculas (padrão PostgreSQL)
-- 
-- Esta versão usa nomes sem aspas duplas para evitar problemas de case-sensitivity
-- no pgAdmin e outras ferramentas

BEGIN;

-- =====================================================
-- TABELA 1: PARAMETROS
-- =====================================================
-- Armazena parâmetros gerais do sistema
CREATE TABLE IF NOT EXISTS parametros (
    vl_destaque_nacional NUMERIC(8,2) NOT NULL DEFAULT 0.00
);

-- Adicionar comentários para documentação
COMMENT ON TABLE parametros IS 'Tabela para armazenar parâmetros gerais do sistema';
COMMENT ON COLUMN parametros.vl_destaque_nacional IS 'Valor do destaque nacional (NUMERIC 8,2)';

-- Inserir registro inicial se a tabela estiver vazia
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM parametros) THEN
        INSERT INTO parametros (vl_destaque_nacional) VALUES (0.00);
    END IF;
END $$;

-- =====================================================
-- TABELA 2: VALOR_DESTAQUE_LOCAL
-- =====================================================
-- Armazena valores de destaque por localização (estado e cidade)
CREATE TABLE IF NOT EXISTS valor_destaque_local (
    id SERIAL PRIMARY KEY,
    estado_fk VARCHAR(2) NOT NULL,
    cidade_fk VARCHAR(100) NOT NULL,
    valor_destaque NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint para evitar duplicatas (mesmo estado e cidade)
    UNIQUE(estado_fk, cidade_fk)
);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_valor_destaque_local_estado ON valor_destaque_local(estado_fk);
CREATE INDEX IF NOT EXISTS idx_valor_destaque_local_cidade ON valor_destaque_local(cidade_fk);
CREATE INDEX IF NOT EXISTS idx_valor_destaque_local_estado_cidade ON valor_destaque_local(estado_fk, cidade_fk);

-- Adicionar comentários para documentação
COMMENT ON TABLE valor_destaque_local IS 'Tabela para armazenar valores de destaque por localização (estado e cidade)';
COMMENT ON COLUMN valor_destaque_local.id IS 'Chave primária auto incremento';
COMMENT ON COLUMN valor_destaque_local.estado_fk IS 'Sigla do estado (VARCHAR(2)) - FK para estados';
COMMENT ON COLUMN valor_destaque_local.cidade_fk IS 'Nome da cidade (VARCHAR(100)) - FK para cidades';
COMMENT ON COLUMN valor_destaque_local.valor_destaque IS 'Valor do destaque local (NUMERIC 8,2)';
COMMENT ON COLUMN valor_destaque_local.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN valor_destaque_local.updated_at IS 'Data e hora da última atualização do registro';

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_valor_destaque_local_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_valor_destaque_local_updated_at
    BEFORE UPDATE ON valor_destaque_local
    FOR EACH ROW
    EXECUTE FUNCTION update_valor_destaque_local_updated_at();

COMMIT;

-- Verificação pós-criação
SELECT 'Tabela parametros criada com sucesso!' AS status;
SELECT 'Total de registros em parametros:', COUNT(*) FROM parametros;

SELECT 'Tabela valor_destaque_local criada com sucesso!' AS status;
SELECT 'Total de registros em valor_destaque_local:', COUNT(*) FROM valor_destaque_local;

-- Verificação final
SELECT 
    table_name,
    'CRIADA COM SUCESSO' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('parametros', 'valor_destaque_local')
ORDER BY table_name;


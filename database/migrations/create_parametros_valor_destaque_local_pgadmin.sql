-- Migration para pgAdmin: Criar tabelas Parametros e Valor_Destaque_Local
-- Este script funciona mesmo com transações pendentes
-- IMPORTANTE: Execute cada seção separadamente se necessário

-- =====================================================
-- SEÇÃO 1: Limpar objetos antigos (execute esta primeiro)
-- =====================================================

DO $$
BEGIN
    -- Remover triggers
    DROP TRIGGER IF EXISTS trigger_update_valor_destaque_local_updated_at ON "Valor_Destaque_Local";
    DROP TRIGGER IF EXISTS trigger_update_valor_destaque_local_updated_at ON valor_destaque_local;
    
    -- Remover função
    DROP FUNCTION IF EXISTS update_valor_destaque_local_updated_at() CASCADE;
    
    -- Remover índices
    DROP INDEX IF EXISTS idx_valor_destaque_local_estado_cidade;
    DROP INDEX IF EXISTS idx_valor_destaque_local_cidade;
    DROP INDEX IF EXISTS idx_valor_destaque_local_estado;
    
    -- Remover tabelas
    DROP TABLE IF EXISTS "Valor_Destaque_Local" CASCADE;
    DROP TABLE IF EXISTS valor_destaque_local CASCADE;
    DROP TABLE IF EXISTS "Parametros" CASCADE;
    DROP TABLE IF EXISTS parametros CASCADE;
    
    RAISE NOTICE 'Objetos antigos removidos com sucesso';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao remover objetos antigos (podem não existir): %', SQLERRM;
END $$;

-- =====================================================
-- SEÇÃO 2: Criar tabela parametros
-- =====================================================

DO $$
BEGIN
    CREATE TABLE parametros (
        vl_destaque_nacional NUMERIC(8,2) NOT NULL DEFAULT 0.00
    );
    
    COMMENT ON TABLE parametros IS 'Tabela para armazenar parâmetros gerais do sistema';
    COMMENT ON COLUMN parametros.vl_destaque_nacional IS 'Valor do destaque nacional (NUMERIC 8,2)';
    
    INSERT INTO parametros (vl_destaque_nacional) VALUES (0.00);
    
    RAISE NOTICE 'Tabela parametros criada com sucesso';
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'Tabela parametros já existe';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao criar tabela parametros: %', SQLERRM;
END $$;

-- =====================================================
-- SEÇÃO 3: Criar tabela valor_destaque_local
-- =====================================================

DO $$
BEGIN
    CREATE TABLE valor_destaque_local (
        id SERIAL PRIMARY KEY,
        estado_fk VARCHAR(2) NOT NULL,
        cidade_fk VARCHAR(100) NOT NULL,
        valor_destaque NUMERIC(8,2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(estado_fk, cidade_fk)
    );
    
    -- Criar índices
    CREATE INDEX idx_valor_destaque_local_estado ON valor_destaque_local(estado_fk);
    CREATE INDEX idx_valor_destaque_local_cidade ON valor_destaque_local(cidade_fk);
    CREATE INDEX idx_valor_destaque_local_estado_cidade ON valor_destaque_local(estado_fk, cidade_fk);
    
    -- Comentários
    COMMENT ON TABLE valor_destaque_local IS 'Tabela para armazenar valores de destaque por localização (estado e cidade)';
    COMMENT ON COLUMN valor_destaque_local.id IS 'Chave primária auto incremento';
    COMMENT ON COLUMN valor_destaque_local.estado_fk IS 'Sigla do estado (VARCHAR(2)) - FK para estados';
    COMMENT ON COLUMN valor_destaque_local.cidade_fk IS 'Nome da cidade (VARCHAR(100)) - FK para cidades';
    COMMENT ON COLUMN valor_destaque_local.valor_destaque IS 'Valor do destaque local (NUMERIC 8,2)';
    COMMENT ON COLUMN valor_destaque_local.created_at IS 'Data e hora de criação do registro';
    COMMENT ON COLUMN valor_destaque_local.updated_at IS 'Data e hora da última atualização do registro';
    
    RAISE NOTICE 'Tabela valor_destaque_local criada com sucesso';
EXCEPTION
    WHEN duplicate_table THEN
        RAISE NOTICE 'Tabela valor_destaque_local já existe';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao criar tabela valor_destaque_local: %', SQLERRM;
END $$;

-- =====================================================
-- SEÇÃO 4: Criar função e trigger
-- =====================================================

-- Criar função (fora do bloco DO para evitar conflito de delimitadores)
CREATE OR REPLACE FUNCTION update_valor_destaque_local_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

-- Criar trigger
DO $$
BEGIN
    DROP TRIGGER IF EXISTS trigger_update_valor_destaque_local_updated_at ON valor_destaque_local;
    
    CREATE TRIGGER trigger_update_valor_destaque_local_updated_at
        BEFORE UPDATE ON valor_destaque_local
        FOR EACH ROW
        EXECUTE FUNCTION update_valor_destaque_local_updated_at();
    
    RAISE NOTICE 'Função e trigger criados com sucesso';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao criar trigger: %', SQLERRM;
END $$;

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT 
    'VERIFICAÇÃO' as tipo,
    table_name as tabela,
    'CRIADA' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('parametros', 'valor_destaque_local')
ORDER BY table_name;


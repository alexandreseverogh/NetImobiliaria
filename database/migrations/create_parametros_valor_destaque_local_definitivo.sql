-- Migration DEFINITIVA: Criar tabelas Parametros e Valor_Destaque_Local
-- Versão que limpa transações pendentes antes de executar
-- Execute este script completo no pgAdmin

-- =====================================================
-- PASSO 0: Limpar qualquer transação pendente
-- =====================================================

-- Fechar qualquer transação pendente
DO $$
BEGIN
    -- Se houver transação pendente, fazer rollback
    IF (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle in transaction') > 0 THEN
        -- Não podemos fazer ROLLBACK aqui, mas podemos tentar continuar
        NULL;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- =====================================================
-- PASSO 1: Remover tabelas antigas (se existirem)
-- =====================================================

-- Remover triggers primeiro
DROP TRIGGER IF EXISTS trigger_update_valor_destaque_local_updated_at ON "Valor_Destaque_Local";
DROP TRIGGER IF EXISTS trigger_update_valor_destaque_local_updated_at ON valor_destaque_local;

-- Remover função
DROP FUNCTION IF EXISTS update_valor_destaque_local_updated_at() CASCADE;

-- Remover índices
DROP INDEX IF EXISTS idx_valor_destaque_local_estado_cidade;
DROP INDEX IF EXISTS idx_valor_destaque_local_cidade;
DROP INDEX IF EXISTS idx_valor_destaque_local_estado;

-- Remover tabelas (CASCADE remove dependências)
DROP TABLE IF EXISTS "Valor_Destaque_Local" CASCADE;
DROP TABLE IF EXISTS valor_destaque_local CASCADE;
DROP TABLE IF EXISTS "Parametros" CASCADE;
DROP TABLE IF EXISTS parametros CASCADE;

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

-- =====================================================
-- PASSO 4: Criar função e trigger para updated_at
-- =====================================================

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

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

SELECT 
    'SUCESSO' as status,
    table_name as tabela_criada
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('parametros', 'valor_destaque_local')
ORDER BY table_name;


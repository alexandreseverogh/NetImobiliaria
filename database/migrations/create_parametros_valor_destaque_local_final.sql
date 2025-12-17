-- Migration FINAL: Criar tabelas Parametros e Valor_Destaque_Local
-- Data: 2025-01-XX
-- Descrição: Versão sem transação explícita para evitar erros de transação interrompida
-- 
-- Esta versão executa comandos individuais sem BEGIN/COMMIT para evitar problemas

-- =====================================================
-- PASSO 1: REMOVER TABELAS ANTIGAS (se existirem)
-- =====================================================

-- Remover trigger e função (se existirem)
DROP TRIGGER IF EXISTS trigger_update_valor_destaque_local_updated_at ON "Valor_Destaque_Local";
DROP TRIGGER IF EXISTS trigger_update_valor_destaque_local_updated_at ON valor_destaque_local;
DROP FUNCTION IF EXISTS update_valor_destaque_local_updated_at();

-- Remover índices (se existirem)
DROP INDEX IF EXISTS idx_valor_destaque_local_estado_cidade;
DROP INDEX IF EXISTS idx_valor_destaque_local_cidade;
DROP INDEX IF EXISTS idx_valor_destaque_local_estado;

-- Remover tabelas antigas (com e sem aspas)
DROP TABLE IF EXISTS "Valor_Destaque_Local" CASCADE;
DROP TABLE IF EXISTS valor_destaque_local CASCADE;
DROP TABLE IF EXISTS "Parametros" CASCADE;
DROP TABLE IF EXISTS parametros CASCADE;

-- =====================================================
-- PASSO 2: CRIAR TABELA PARAMETROS
-- =====================================================

CREATE TABLE IF NOT EXISTS parametros (
    vl_destaque_nacional NUMERIC(8,2) NOT NULL DEFAULT 0.00
);

COMMENT ON TABLE parametros IS 'Tabela para armazenar parâmetros gerais do sistema';
COMMENT ON COLUMN parametros.vl_destaque_nacional IS 'Valor do destaque nacional (NUMERIC 8,2)';

-- Inserir registro inicial apenas se a tabela estiver vazia
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM parametros LIMIT 1) THEN
        INSERT INTO parametros (vl_destaque_nacional) VALUES (0.00);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Se der erro, não faz nada (tabela pode já ter dados)
        NULL;
END $$;

-- =====================================================
-- PASSO 3: CRIAR TABELA VALOR_DESTAQUE_LOCAL
-- =====================================================

CREATE TABLE IF NOT EXISTS valor_destaque_local (
    id SERIAL PRIMARY KEY,
    estado_fk VARCHAR(2) NOT NULL,
    cidade_fk VARCHAR(100) NOT NULL,
    valor_destaque NUMERIC(8,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(estado_fk, cidade_fk)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_valor_destaque_local_estado ON valor_destaque_local(estado_fk);
CREATE INDEX IF NOT EXISTS idx_valor_destaque_local_cidade ON valor_destaque_local(cidade_fk);
CREATE INDEX IF NOT EXISTS idx_valor_destaque_local_estado_cidade ON valor_destaque_local(estado_fk, cidade_fk);

-- Comentários
COMMENT ON TABLE valor_destaque_local IS 'Tabela para armazenar valores de destaque por localização (estado e cidade)';
COMMENT ON COLUMN valor_destaque_local.id IS 'Chave primária auto incremento';
COMMENT ON COLUMN valor_destaque_local.estado_fk IS 'Sigla do estado (VARCHAR(2)) - FK para estados';
COMMENT ON COLUMN valor_destaque_local.cidade_fk IS 'Nome da cidade (VARCHAR(100)) - FK para cidades';
COMMENT ON COLUMN valor_destaque_local.valor_destaque IS 'Valor do destaque local (NUMERIC 8,2)';
COMMENT ON COLUMN valor_destaque_local.created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN valor_destaque_local.updated_at IS 'Data e hora da última atualização do registro';

-- =====================================================
-- PASSO 4: CRIAR FUNÇÃO E TRIGGER PARA updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_valor_destaque_local_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_valor_destaque_local_updated_at ON valor_destaque_local;

CREATE TRIGGER trigger_update_valor_destaque_local_updated_at
    BEFORE UPDATE ON valor_destaque_local
    FOR EACH ROW
    EXECUTE FUNCTION update_valor_destaque_local_updated_at();

-- =====================================================
-- VERIFICAÇÃO FINAL
-- =====================================================

-- Verificar se as tabelas foram criadas
SELECT 
    'VERIFICAÇÃO' as tipo,
    table_name as tabela,
    'CRIADA COM SUCESSO' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('parametros', 'valor_destaque_local')
ORDER BY table_name;

-- Verificar estrutura da tabela parametros
SELECT 
    'ESTRUTURA parametros' as tipo,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'parametros'
ORDER BY ordinal_position;

-- Verificar estrutura da tabela valor_destaque_local
SELECT 
    'ESTRUTURA valor_destaque_local' as tipo,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'valor_destaque_local'
ORDER BY ordinal_position;

-- Verificar dados
SELECT 
    'DADOS parametros' as tipo,
    COUNT(*) as total_registros 
FROM parametros;

SELECT 
    'DADOS valor_destaque_local' as tipo,
    COUNT(*) as total_registros 
FROM valor_destaque_local;


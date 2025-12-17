-- Migration: Criar tabelas Parametros e Valor_Destaque_Local
-- Data: 2025-01-XX
-- Descrição: Criação de duas novas tabelas para gerenciar valores de destaque nacional e local
-- 
-- Tabelas criadas:
-- 1. parametros - Armazena parâmetros gerais do sistema (valor de destaque nacional)
-- 2. valor_destaque_local - Armazena valores de destaque por estado e cidade

BEGIN;

-- =====================================================
-- TABELA 1: PARAMETROS
-- =====================================================
-- Armazena parâmetros gerais do sistema
CREATE TABLE IF NOT EXISTS "Parametros" (
    "Vl_Destaque_Nacional" NUMERIC(8,2) NOT NULL DEFAULT 0.00
);

-- Adicionar comentários para documentação
COMMENT ON TABLE "Parametros" IS 'Tabela para armazenar parâmetros gerais do sistema';
COMMENT ON COLUMN "Parametros"."Vl_Destaque_Nacional" IS 'Valor do destaque nacional (NUMERIC 8,2)';

-- Inserir registro inicial se a tabela estiver vazia
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "Parametros") THEN
        INSERT INTO "Parametros" ("Vl_Destaque_Nacional") VALUES (0.00);
    END IF;
END $$;

-- =====================================================
-- TABELA 2: VALOR_DESTAQUE_LOCAL
-- =====================================================
-- Armazena valores de destaque por localização (estado e cidade)
CREATE TABLE IF NOT EXISTS "Valor_Destaque_Local" (
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
CREATE INDEX IF NOT EXISTS idx_valor_destaque_local_estado ON "Valor_Destaque_Local"(estado_fk);
CREATE INDEX IF NOT EXISTS idx_valor_destaque_local_cidade ON "Valor_Destaque_Local"(cidade_fk);
CREATE INDEX IF NOT EXISTS idx_valor_destaque_local_estado_cidade ON "Valor_Destaque_Local"(estado_fk, cidade_fk);

-- Adicionar comentários para documentação
COMMENT ON TABLE "Valor_Destaque_Local" IS 'Tabela para armazenar valores de destaque por localização (estado e cidade)';
COMMENT ON COLUMN "Valor_Destaque_Local".id IS 'Chave primária auto incremento';
COMMENT ON COLUMN "Valor_Destaque_Local".estado_fk IS 'Sigla do estado (VARCHAR) - FK para estados';
COMMENT ON COLUMN "Valor_Destaque_Local".cidade_fk IS 'Nome da cidade (VARCHAR) - FK para cidades';
COMMENT ON COLUMN "Valor_Destaque_Local".valor_destaque IS 'Valor do destaque local (NUMERIC 8,2)';
COMMENT ON COLUMN "Valor_Destaque_Local".created_at IS 'Data e hora de criação do registro';
COMMENT ON COLUMN "Valor_Destaque_Local".updated_at IS 'Data e hora da última atualização do registro';

-- Criar trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_valor_destaque_local_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_valor_destaque_local_updated_at
    BEFORE UPDATE ON "Valor_Destaque_Local"
    FOR EACH ROW
    EXECUTE FUNCTION update_valor_destaque_local_updated_at();

COMMIT;

-- Verificação pós-criação
SELECT 'Tabela Parametros criada com sucesso!' AS status;
SELECT 'Total de registros em Parametros:', COUNT(*) FROM "Parametros";

SELECT 'Tabela Valor_Destaque_Local criada com sucesso!' AS status;
SELECT 'Total de registros em Valor_Destaque_Local:', COUNT(*) FROM "Valor_Destaque_Local";


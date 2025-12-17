-- Script: Criar tabela imovel_prospects
-- Data: 2025-01-XX
-- Descrição: Nova tabela para rastrear quais imóveis os clientes demonstraram interesse (prospects)
-- 
-- Esta é uma NOVA funcionalidade que será implementada para:
-- - Rastrear quais imóveis cada cliente se interessou
-- - Gerar relatórios de interesse por cliente
-- - Analisar comportamento de clientes
-- - Popular via novas funcionalidades (ex: botão "Tenho Interesse" nos cards de imóveis)

BEGIN;

-- Criar tabela imovel_prospects
CREATE TABLE IF NOT EXISTS imovel_prospects (
    id SERIAL PRIMARY KEY,
    id_cliente UUID NOT NULL REFERENCES clientes(uuid) ON DELETE CASCADE,
    id_imovel INTEGER NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES clientes(uuid),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraint para evitar duplicatas (mesmo cliente interessado no mesmo imóvel)
    UNIQUE(id_cliente, id_imovel)
);

-- Criar índice para id_cliente (para facilitar consultas de quais imóveis um cliente se interessou)
CREATE INDEX IF NOT EXISTS idx_imovel_prospects_id_cliente ON imovel_prospects(id_cliente);

-- Criar índice para id_imovel (para facilitar consultas de quais clientes se interessaram por um imóvel)
CREATE INDEX IF NOT EXISTS idx_imovel_prospects_id_imovel ON imovel_prospects(id_imovel);

-- Criar índice para created_at (para facilitar consultas por data)
CREATE INDEX IF NOT EXISTS idx_imovel_prospects_created_at ON imovel_prospects(created_at);

-- Adicionar comentários para documentação
COMMENT ON TABLE imovel_prospects IS 'Tabela para rastrear quais imóveis os clientes demonstraram interesse (prospects)';
COMMENT ON COLUMN imovel_prospects.id IS 'Chave primária auto incremento';
COMMENT ON COLUMN imovel_prospects.id_cliente IS 'UUID do cliente que demonstrou interesse (FK para clientes.uuid)';
COMMENT ON COLUMN imovel_prospects.id_imovel IS 'ID do imóvel de interesse (FK para imoveis.id)';
COMMENT ON COLUMN imovel_prospects.created_by IS 'UUID do cliente logado que registrou o interesse';
COMMENT ON COLUMN imovel_prospects.created_at IS 'Data e hora em que o interesse foi registrado';

COMMIT;

-- Verificação pós-criação
SELECT 'Tabela imovel_prospects criada com sucesso!' AS status;
SELECT 'Total de registros:', COUNT(*) FROM imovel_prospects;


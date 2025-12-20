-- Script: Adicionar campos preferencia_contato e mensagem à tabela imovel_prospects
-- Data: 2025-01-XX
-- Descrição: Adiciona campos para armazenar preferência de contato e mensagem do cliente ao demonstrar interesse

BEGIN;

-- Adicionar coluna preferencia_contato
ALTER TABLE imovel_prospects 
ADD COLUMN IF NOT EXISTS preferencia_contato VARCHAR(20) DEFAULT NULL;

-- Adicionar coluna mensagem
ALTER TABLE imovel_prospects 
ADD COLUMN IF NOT EXISTS mensagem TEXT DEFAULT NULL;

-- Adicionar comentários para documentação
COMMENT ON COLUMN imovel_prospects.preferencia_contato IS 'Preferência de contato do cliente: telefone, email ou ambos';
COMMENT ON COLUMN imovel_prospects.mensagem IS 'Mensagem opcional do cliente sobre seu interesse no imóvel';

COMMIT;

-- Verificação
SELECT 'Campos preferencia_contato e mensagem adicionados à tabela imovel_prospects!' AS status;










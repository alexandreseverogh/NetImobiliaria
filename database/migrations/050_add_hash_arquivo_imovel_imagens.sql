-- Migration 050: Adicionar coluna hash_arquivo na tabela imovel_imagens
-- Propósito: Detectar imagens duplicadas com precisão usando hash SHA-256 do buffer
-- O hash é calculado no momento do upload e armazenado para comparação futura

ALTER TABLE imovel_imagens 
ADD COLUMN IF NOT EXISTS hash_arquivo VARCHAR(64) DEFAULT NULL;

-- Índice para busca rápida por hash (deduplicação em O(1))
CREATE INDEX IF NOT EXISTS idx_imovel_imagens_hash_arquivo 
ON imovel_imagens(hash_arquivo) 
WHERE hash_arquivo IS NOT NULL;

-- Índice composto para busca por imovel_id + hash (caso de uso mais comum)
CREATE INDEX IF NOT EXISTS idx_imovel_imagens_imovel_hash 
ON imovel_imagens(imovel_id, hash_arquivo) 
WHERE hash_arquivo IS NOT NULL;

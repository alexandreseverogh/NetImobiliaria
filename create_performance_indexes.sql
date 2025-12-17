-- Script para criar índices de performance para otimização de imóveis
-- Execute este script no PostgreSQL para melhorar a performance

-- Verificar índices existentes
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('imovel_amenidades', 'imovel_proximidades', 'imoveis')
ORDER BY tablename, indexname;

-- Criar índices para otimizar performance

-- 1. Índice para imovel_amenidades (imovel_id)
CREATE INDEX IF NOT EXISTS idx_imovel_amenidades_imovel_id 
ON imovel_amenidades(imovel_id);

-- 2. Índice para imovel_amenidades (amenidade_id)
CREATE INDEX IF NOT EXISTS idx_imovel_amenidades_amenidade_id 
ON imovel_amenidades(amenidade_id);

-- 3. Índice composto para imovel_amenidades (imovel_id, amenidade_id)
CREATE INDEX IF NOT EXISTS idx_imovel_amenidades_composto 
ON imovel_amenidades(imovel_id, amenidade_id);

-- 4. Índice para imovel_proximidades (imovel_id)
CREATE INDEX IF NOT EXISTS idx_imovel_proximidades_imovel_id 
ON imovel_proximidades(imovel_id);

-- 5. Índice para imovel_proximidades (proximidade_id)
CREATE INDEX IF NOT EXISTS idx_imovel_proximidades_proximidade_id 
ON imovel_proximidades(proximidade_id);

-- 6. Índice composto para imovel_proximidades (imovel_id, proximidade_id)
CREATE INDEX IF NOT EXISTS idx_imovel_proximidades_composto 
ON imovel_proximidades(imovel_id, proximidade_id);

-- 7. Índices para tabela imoveis (campos mais consultados)
CREATE INDEX IF NOT EXISTS idx_imoveis_tipo_fk 
ON imoveis(tipo_fk);

CREATE INDEX IF NOT EXISTS idx_imoveis_finalidade_fk 
ON imoveis(finalidade_fk);

CREATE INDEX IF NOT EXISTS idx_imoveis_status_fk 
ON imoveis(status_fk);

CREATE INDEX IF NOT EXISTS idx_imoveis_cidade_fk 
ON imoveis(cidade_fk);

CREATE INDEX IF NOT EXISTS idx_imoveis_estado_fk 
ON imoveis(estado_fk);

CREATE INDEX IF NOT EXISTS idx_imoveis_ativo 
ON imoveis(ativo);

CREATE INDEX IF NOT EXISTS idx_imoveis_destaque 
ON imoveis(destaque);

-- 8. Índice composto para consultas comuns
CREATE INDEX IF NOT EXISTS idx_imoveis_consulta_principal 
ON imoveis(ativo, destaque, tipo_fk, finalidade_fk, cidade_fk);

-- Verificar índices criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('imovel_amenidades', 'imovel_proximidades', 'imoveis')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Estatísticas de uso dos índices
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as "Scans",
    idx_tup_read as "Tuples Read",
    idx_tup_fetch as "Tuples Fetched"
FROM pg_stat_user_indexes 
WHERE tablename IN ('imovel_amenidades', 'imovel_proximidades', 'imoveis')
ORDER BY tablename, indexname;








-- Estratégia de Índices Otimizada para Performance
-- Focar apenas nos índices ESSENCIAIS para as operações mais comuns

-- 1. REMOVER índices desnecessários (que não são usados frequentemente)
DROP INDEX IF EXISTS idx_imoveis_area_total;
DROP INDEX IF EXISTS idx_imoveis_quartos;
DROP INDEX IF EXISTS idx_imoveis_preco;
DROP INDEX IF EXISTS idx_imoveis_bairro;
DROP INDEX IF EXISTS idx_imoveis_cidade_fk_varchar;
DROP INDEX IF EXISTS idx_imoveis_estado_fk_varchar;
DROP INDEX IF EXISTS idx_imoveis_titulo_gin;
DROP INDEX IF EXISTS idx_imoveis_descricao_gin;

-- 2. MANTER apenas os índices ESSENCIAIS:

-- Índice composto para as consultas mais comuns (tipo + finalidade + status)
-- Este é o mais importante para filtros combinados
CREATE INDEX IF NOT EXISTS idx_imoveis_tipo_finalidade_status 
ON imoveis(tipo_fk, finalidade_fk, status_fk);

-- Índice para busca por código (único, usado frequentemente)
-- Já existe: idx_imoveis_codigo

-- Índice para busca por cidade (usado em filtros)
-- Já existe: idx_imoveis_cidade_fk

-- Índice para busca por estado (usado em filtros)  
-- Já existe: idx_imoveis_estado_fk

-- Índice para busca por ativo (usado para filtrar imóveis ativos)
-- Já existe: idx_imoveis_ativo

-- 3. VERIFICAR índices existentes e sua utilização
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_indexes 
WHERE tablename = 'imoveis'
ORDER BY pg_relation_size(indexrelid) DESC;

-- 4. ANÁLISE de uso dos índices (executar após algumas operações)
-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     idx_scan as scans,
--     idx_tup_read as tuples_read,
--     idx_tup_fetch as tuples_fetched
-- FROM pg_stat_user_indexes 
-- WHERE tablename = 'imoveis'
-- ORDER BY idx_scan DESC;








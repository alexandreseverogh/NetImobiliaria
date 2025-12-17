-- Análise de uso dos índices da tabela imoveis

-- 1. Verificar estatísticas de uso dos índices
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
WHERE relname = 'imoveis'
ORDER BY idx_scan DESC;

-- 2. Verificar estatísticas da tabela
SELECT 
    schemaname,
    relname as tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    pg_size_pretty(pg_total_relation_size(oid)) as total_size
FROM pg_stat_user_tables 
WHERE relname = 'imoveis';

-- 3. Verificar índices não utilizados
SELECT 
    schemaname,
    relname as tablename,
    indexrelname as indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes 
WHERE relname = 'imoveis' 
AND idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;

-- 4. Verificar estrutura dos índices
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'imoveis'
ORDER BY indexname;








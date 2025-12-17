-- Verificar índices existentes e criar os necessários para performance
-- Tabela: imovel_amenidades
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'imovel_amenidades'
ORDER BY indexname;

-- Tabela: imovel_proximidades  
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'imovel_proximidades'
ORDER BY indexname;

-- Tabela: imoveis
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'imoveis'
ORDER BY indexname;

-- Criar índices adicionais para performance se não existirem
-- Índice composto para imoveis (tipo_fk, finalidade_fk, status_fk)
CREATE INDEX IF NOT EXISTS idx_imoveis_tipo_finalidade_status 
ON imoveis(tipo_fk, finalidade_fk, status_fk);

-- Índice para busca por preço
CREATE INDEX IF NOT EXISTS idx_imoveis_preco 
ON imoveis(preco);

-- Índice para busca por área
CREATE INDEX IF NOT EXISTS idx_imoveis_area_total 
ON imoveis(area_total);

-- Índice para busca por quartos
CREATE INDEX IF NOT EXISTS idx_imoveis_quartos 
ON imoveis(quartos);

-- Índice para busca por cidade
CREATE INDEX IF NOT EXISTS idx_imoveis_cidade_fk 
ON imoveis(cidade_fk);

-- Índice para busca por estado
CREATE INDEX IF NOT EXISTS idx_imoveis_estado_fk 
ON imoveis(estado_fk);

-- Índice para busca por bairro
CREATE INDEX IF NOT EXISTS idx_imoveis_bairro 
ON imoveis(bairro);

-- Índice para busca por código
CREATE INDEX IF NOT EXISTS idx_imoveis_codigo 
ON imoveis(codigo);

-- Índice para busca por título (usando gin para busca de texto)
CREATE INDEX IF NOT EXISTS idx_imoveis_titulo_gin 
ON imoveis USING gin(to_tsvector('portuguese', titulo));

-- Índice para busca por descrição (usando gin para busca de texto)
CREATE INDEX IF NOT EXISTS idx_imoveis_descricao_gin 
ON imoveis USING gin(to_tsvector('portuguese', descricao));

-- Verificar estatísticas das tabelas
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples
FROM pg_stat_user_tables 
WHERE tablename IN ('imoveis', 'imovel_amenidades', 'imovel_proximidades')
ORDER BY tablename;








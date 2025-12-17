-- Análise e limpeza de índices desnecessários e duplicados

-- 1. Verificar índices existentes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'imoveis'
ORDER BY indexname;

-- 2. Remover índices desnecessários identificados pelo usuário:

-- idx_imoveis_complemento - desnecessário (campo raramente usado em filtros)
DROP INDEX IF EXISTS idx_imoveis_complemento;

-- idx_imoveis_taxa_extra - desnecessário (campo raramente usado em filtros)
DROP INDEX IF EXISTS idx_imoveis_taxa_extra;

-- idx_imoveis_destaque - desnecessário (campo raramente usado em filtros)
DROP INDEX IF EXISTS idx_imoveis_destaque;

-- 3. Verificar duplicatas:

-- idx_imoveis_finalidade_fk vs idx_imoveis_finalidade_id (mesmo campo)
-- Manter apenas um
DROP INDEX IF EXISTS idx_imoveis_finalidade_id;

-- idx_imoveis_status vs idx_imoveis_status_fk (mesmo campo)
-- Manter apenas um
DROP INDEX IF EXISTS idx_imoveis_status;

-- 4. Verificar índices de tipo:
-- idx_imoveis_tipo_fk vs idx_imoveis_tipo_id (mesmo campo)
-- Manter apenas um
DROP INDEX IF EXISTS idx_imoveis_tipo_id;

-- 5. Verificar índices de código:
-- idx_imoveis_codigo vs imoveis_codigo_key
-- imoveis_codigo_key é UNIQUE CONSTRAINT, idx_imoveis_codigo é redundante
DROP INDEX IF EXISTS idx_imoveis_codigo;

-- 6. Verificar chave primária:
-- imoveis_pkey é a chave primária (id), não pode ser removida

-- 7. Listar índices finais
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'imoveis'
ORDER BY indexname;








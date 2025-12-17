-- ================================================================
-- ROLLBACK: Remover campo tipo_destaque de finalidades_imovel
-- Data: 2025-11-04
-- USO: Apenas se algo der errado e precisar reverter
-- ================================================================

-- Remover constraint
ALTER TABLE finalidades_imovel
DROP CONSTRAINT IF EXISTS chk_tipo_destaque;

-- Remover coluna
ALTER TABLE finalidades_imovel 
DROP COLUMN IF EXISTS tipo_destaque;

-- Verificação
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'finalidades_imovel'
ORDER BY ordinal_position;


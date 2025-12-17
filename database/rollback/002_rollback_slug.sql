-- ============================================================
-- ROLLBACK 002: Remover campo slug de system_features
-- Data: 2025-10-29
-- ============================================================

-- 1. Remover constraint UNIQUE
ALTER TABLE system_features 
DROP CONSTRAINT IF EXISTS system_features_slug_unique;

-- 2. Remover índice
DROP INDEX IF EXISTS idx_system_features_slug;

-- 3. Remover coluna slug
ALTER TABLE system_features 
DROP COLUMN IF EXISTS slug;

-- 4. Remover função de normalização
DROP FUNCTION IF EXISTS normalize_to_slug(TEXT);

-- 5. Verificação
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'Coluna slug removida com sucesso'
        ELSE 'ERRO: Coluna ainda existe'
    END as status
FROM information_schema.columns
WHERE table_name = 'system_features' 
  AND column_name = 'slug';

-- ============================================================
-- ROLLBACK 002 CONCLUÍDO
-- ============================================================



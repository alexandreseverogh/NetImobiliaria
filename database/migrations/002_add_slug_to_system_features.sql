-- ============================================================
-- MIGRATION 002: Adicionar campo slug em system_features
-- Data: 2025-10-29
-- Objetivo: Eliminar hardcoding de mapFeatureToResource
-- ============================================================

-- ============================================================
-- 1. ADICIONAR COLUNA SLUG
-- ============================================================

ALTER TABLE system_features 
ADD COLUMN IF NOT EXISTS slug VARCHAR(100);

-- ============================================================
-- 2. CRIAR FUNÇÃO DE NORMALIZAÇÃO
-- ============================================================

CREATE OR REPLACE FUNCTION normalize_to_slug(text_input TEXT) 
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    REPLACE(
                        REPLACE(
                            REPLACE(
                                REPLACE(
                                    REPLACE(text_input, 'ç', 'c'),
                                    'ã', 'a'
                                ),
                                'õ', 'o'
                            ),
                            'á', 'a'
                        ),
                        'é', 'e'
                    ),
                    'í', 'i'
                ),
                'ó', 'o'
            ),
            '[^a-z0-9]+', '-', 'g'
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================================
-- 3. POPULAR SLUG PARA REGISTROS EXISTENTES
-- ============================================================

UPDATE system_features 
SET slug = normalize_to_slug(name)
WHERE slug IS NULL;

-- ============================================================
-- 4. VERIFICAR DUPLICADOS ANTES DE APLICAR UNIQUE
-- ============================================================

DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT slug, COUNT(*) as cnt
        FROM system_features
        GROUP BY slug
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE NOTICE 'ATENÇÃO: Encontrados % slugs duplicados!', duplicate_count;
        RAISE NOTICE 'Execute a query abaixo para ver os duplicados:';
        RAISE NOTICE 'SELECT slug, COUNT(*), STRING_AGG(name, '', '') as names FROM system_features GROUP BY slug HAVING COUNT(*) > 1;';
    ELSE
        RAISE NOTICE 'OK: Nenhum slug duplicado encontrado.';
    END IF;
END $$;

-- ============================================================
-- 5. RESOLVER DUPLICADOS AUTOMATICAMENTE (se houver)
-- ============================================================

-- Adiciona sufixo numérico para duplicados
WITH duplicates AS (
    SELECT 
        id,
        slug,
        ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) as rn
    FROM system_features
)
UPDATE system_features sf
SET slug = sf.slug || '-' || d.rn
FROM duplicates d
WHERE sf.id = d.id AND d.rn > 1;

-- ============================================================
-- 6. TORNAR SLUG OBRIGATÓRIO E ÚNICO
-- ============================================================

ALTER TABLE system_features 
ALTER COLUMN slug SET NOT NULL;

ALTER TABLE system_features 
ADD CONSTRAINT system_features_slug_unique UNIQUE (slug);

-- ============================================================
-- 7. CRIAR ÍNDICE PARA PERFORMANCE
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_system_features_slug 
ON system_features(slug);

-- ============================================================
-- 8. ADICIONAR COMENTÁRIO
-- ============================================================

COMMENT ON COLUMN system_features.slug IS 
    'Identificador único normalizado para uso em código - elimina mapFeatureToResource()';

-- ============================================================
-- 9. VERIFICAÇÃO FINAL
-- ============================================================

SELECT 
    'Migration 002 concluída' as status,
    COUNT(*) as total_features,
    COUNT(slug) as com_slug,
    COUNT(DISTINCT slug) as slugs_unicos,
    COUNT(*) - COUNT(DISTINCT slug) as duplicados
FROM system_features;

-- Mostrar mapeamento name → slug
SELECT 
    id,
    name,
    slug,
    is_active
FROM system_features
ORDER BY name
LIMIT 10;

-- ============================================================
-- MIGRATION 002 CONCLUÍDA
-- ============================================================



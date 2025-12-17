-- Corrigir função normalize_to_slug
DROP FUNCTION IF EXISTS normalize_to_slug(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION normalize_to_slug(text_input TEXT) 
RETURNS TEXT AS $$
BEGIN
    RETURN LOWER(
        TRIM(BOTH '-' FROM 
            REGEXP_REPLACE(
                REGEXP_REPLACE(
                    REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                        text_input,
                        'ã', 'a'), 'á', 'a'), 'â', 'a'), 'à', 'a'),
                        'é', 'e'), 'ê', 'e'),
                        'í', 'i'),
                        'ó', 'o'), 'ô', 'o'), 'õ', 'o'),
                        'ú', 'u'),
                        'ç', 'c'),
                    '[^a-z0-9]+', '-', 'g'
                ),
                '-+', '-', 'g'
            )
        )
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Regenerar todos os slugs
UPDATE system_features 
SET slug = normalize_to_slug(name);

-- Mostrar resultado
SELECT id, name, slug FROM system_features ORDER BY name LIMIT 15;



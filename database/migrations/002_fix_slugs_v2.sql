-- Corrigir função normalize_to_slug
DROP FUNCTION IF EXISTS normalize_to_slug(TEXT) CASCADE;

CREATE OR REPLACE FUNCTION normalize_to_slug(text_input TEXT) 
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    result := LOWER(text_input);
    result := TRANSLATE(result, 'áàâãéêíóôõúç', 'aaaaeeiooóuc');
    result := REGEXP_REPLACE(result, '[^a-z0-9]+', '-', 'g');
    result := REGEXP_REPLACE(result, '-+', '-', 'g');
    result := TRIM(BOTH '-' FROM result);
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Regenerar todos os slugs
UPDATE system_features 
SET slug = normalize_to_slug(name);

-- Mostrar resultado
SELECT id, name, slug FROM system_features ORDER BY name;




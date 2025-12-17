-- Script para gerar slugs para amenidades e proximidades existentes

-- Função para gerar slug a partir do nome
CREATE OR REPLACE FUNCTION generate_slug(nome TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(nome, '[áàâãä]', 'a', 'g'),
          '[éèêë]', 'e', 'g'
        ),
        '[íìîï]', 'i', 'g'
      ),
      '[óòôõö]', 'o', 'g'
    )
  ) || '-' || 
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(nome, '[áàâãä]', 'a', 'g'),
        '[éèêë]', 'e', 'g'
      ),
      '[íìîï]', 'i', 'g'
    ),
    '[óòôõö]', 'o', 'g'
  ) || '-' ||
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(nome, '[áàâãä]', 'a', 'g'),
        '[éèêë]', 'e', 'g'
      ),
      '[íìîï]', 'i', 'g'
    ),
    '[óòôõö]', 'o', 'g'
  );
END;
$$ LANGUAGE plpgsql;

-- Atualizar amenidades existentes
UPDATE amenidades 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(nome, '[áàâãä]', 'a', 'g'),
        '[éèêë]', 'e', 'g'
      ),
      '[íìîï]', 'i', 'g'
    ),
    '[óòôõö]', 'o', 'g'
  )
) || '-' || id
WHERE slug IS NULL;

-- Atualizar proximidades existentes
UPDATE proximidades 
SET slug = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(nome, '[áàâãä]', 'a', 'g'),
        '[éèêë]', 'e', 'g'
      ),
      '[íìîï]', 'i', 'g'
    ),
    '[óòôõö]', 'o', 'g'
  )
) || '-' || id
WHERE slug IS NULL;

-- Verificar resultados
SELECT 'Amenidades com slugs:' as info;
SELECT id, nome, slug FROM amenidades LIMIT 5;

SELECT 'Proximidades com slugs:' as info;
SELECT id, nome, slug FROM proximidades LIMIT 5;



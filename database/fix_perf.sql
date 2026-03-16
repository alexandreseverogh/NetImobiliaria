CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION public.immutable_unaccent(text) 
RETURNS text AS $func$ 
SELECT public.unaccent('public.unaccent', $1) 
$func$ LANGUAGE sql IMMUTABLE;

CREATE INDEX IF NOT EXISTS idx_imoveis_endereco_unaccent ON imoveis USING gin (immutable_unaccent(endereco::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_imoveis_bairro_unaccent ON imoveis USING gin (immutable_unaccent(bairro::text) gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_imoveis_cidade_unaccent ON imoveis USING gin (immutable_unaccent(cidade_fk::text) gin_trgm_ops);

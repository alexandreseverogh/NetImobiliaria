-- Docker migrations (idempotent)
-- Performance (public search / landing)
-- Objetivo: acelerar filtros com ILIKE '%...%' (bairro/cidade) usando pg_trgm + GIN

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_imoveis_cidade_fk_trgm
  ON public.imoveis USING gin (cidade_fk gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_imoveis_bairro_trgm
  ON public.imoveis USING gin (bairro gin_trgm_ops);



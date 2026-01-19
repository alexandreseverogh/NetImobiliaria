-- Migration: Create Materialized View for Active Locations with Trigger Refresh

-- 1. Create Materialized View
-- Stores distinct state/city pairs that have active properties
-- Using estado_fk and cidade_fk which contain text values
DROP MATERIALIZED VIEW IF EXISTS public.mv_cidades_ativas;

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_cidades_ativas AS
SELECT DISTINCT 
    i.estado_fk as estado,
    i.cidade_fk as cidade
FROM public.imoveis i
INNER JOIN public.status_imovel si ON i.status_fk = si.id
INNER JOIN public.finalidades_imovel fi ON i.finalidade_fk = fi.id
WHERE i.ativo = true
  AND i.status_fk != 100 -- Excluir explicitamente status 100
  AND si.ativo = true
  AND si.consulta_imovel_internauta = true
  AND (fi.vender_landpaging = true OR fi.alugar_landpaging = true)
  AND i.estado_fk IS NOT NULL 
  AND i.cidade_fk IS NOT NULL
  AND i.estado_fk != ''
  AND i.cidade_fk != ''
ORDER BY i.estado_fk, i.cidade_fk;

-- Create unique index for fast lookups (and required for CONCURRENT refresh)
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_cidades_ativas_pk ON public.mv_cidades_ativas (estado, cidade);

-- 2. Create Refresh Function
-- This function refreshes the view concurrently when called
CREATE OR REPLACE FUNCTION public.refresh_mv_cidades_ativas()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_cidades_ativas;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Trigger
-- Trigger fires on any change that could affect the list of active cities
DROP TRIGGER IF EXISTS tg_refresh_mv_cidades_ativas ON public.imoveis;

CREATE TRIGGER tg_refresh_mv_cidades_ativas
AFTER INSERT OR UPDATE OR DELETE OR TRUNCATE
ON public.imoveis
FOR EACH STATEMENT
EXECUTE FUNCTION public.refresh_mv_cidades_ativas();

-- 4. Grant permissions
GRANT SELECT ON public.mv_cidades_ativas TO postgres;

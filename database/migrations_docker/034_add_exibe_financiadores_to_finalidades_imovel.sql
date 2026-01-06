-- 034_add_exibe_financiadores_to_finalidades_imovel.sql
-- Flag para controlar se uma finalidade deve habilitar a lógica de exibição de financiadores
-- (relevante para compra/venda de imóveis na landpaging).

ALTER TABLE public.finalidades_imovel
  ADD COLUMN IF NOT EXISTS exibe_financiadores BOOLEAN NOT NULL DEFAULT FALSE;



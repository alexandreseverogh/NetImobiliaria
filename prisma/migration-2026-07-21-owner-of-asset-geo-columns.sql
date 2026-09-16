-- Complementa segment_distribution_strategies.config da estratégia owner_of_asset com
-- estadoColumn/cidadeColumn — usados como fallback genérico de geografia do lead em
-- /api/crm/leads (antes hardcoded como "SELECT estado_fk, cidade_fk FROM imoveis").
-- Backfill do Imobiliário preserva o comportamento exato de hoje (imoveis.estado_fk/cidade_fk).

UPDATE public.segment_distribution_strategies
   SET config = config || jsonb_build_object('estadoColumn', 'estado_fk', 'cidadeColumn', 'cidade_fk')
 WHERE strategy_key = 'owner_of_asset'
   AND config->>'targetTable' = 'imoveis';

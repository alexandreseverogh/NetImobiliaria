-- crm_segmentos_config ganha segment_id (conecta ao system_segments real, em vez do domain_id
-- solto que sempre foi '1' pra todo mundo) + target_name_column (nome de exibição da entidade,
-- hoje resolvido por um ternário hardcoded em src/app/api/crm/analytics/roi/route.ts:
-- "target_table === 'imoveis' ? 'titulo' : 'nome'"). Aditivo — domain_id e a rota
-- /api/crm/config/segmentos (Segment Builder, enriquecimento de lead) continuam intocados,
-- nenhuma coluna removida.

ALTER TABLE public.crm_segmentos_config
  ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES public.system_segments(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_name_column VARCHAR(100) NOT NULL DEFAULT 'nome';

-- Backfill: a única linha real hoje (domain_id=1, target_table='imoveis') pertence ao segmento
-- Imobiliário — preserva o comportamento atual do ternário (titulo, não nome).
UPDATE public.crm_segmentos_config
   SET segment_id = (SELECT id FROM public.system_segments WHERE slug = 'imobiliaria' LIMIT 1),
       target_name_column = 'titulo'
 WHERE domain_id = 1 AND segment_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_crm_segmentos_config_segment ON public.crm_segmentos_config(segment_id) WHERE is_active = true;

-- Evolução do F7 (docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §6) — de "4 colunas escalares
-- configuram a mesma cascata fixa" para "lista ordenada de estratégias plugáveis por segmento".
-- Motivação: a cascata fixa (dono do ativo → geográfico → plantonista) não serve pra todo
-- segmento (ex.: Saúde importa mais especialidade que geografia; B2B nacional não tem
-- geografia nenhuma) — precisa ser o PRÓPRIO segmento a declarar quais etapas usar e em que
-- ordem, sem depender de código novo pra cada combinação.

CREATE TABLE IF NOT EXISTS public.segment_distribution_strategies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id    UUID NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  strategy_key  VARCHAR(50) NOT NULL,
  priority      INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  config        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (segment_id, strategy_key)
);

CREATE INDEX IF NOT EXISTS idx_segment_distribution_strategies_segment
  ON public.segment_distribution_strategies (segment_id, priority) WHERE is_active = true;

-- Migração de dados do F7: o segmento Imobiliário tinha distribution_target_table='imoveis'/
-- distribution_target_id_column='id'/distribution_owner_column='corretor_fk' — vira a
-- estratégia owner_of_asset com esse config, seguida das mesmas geo_area/plantonista_fallback
-- que já rodavam hardcoded pra ele.
INSERT INTO public.segment_distribution_strategies (segment_id, strategy_key, priority, config)
SELECT id, 'owner_of_asset', 1,
  jsonb_build_object(
    'targetTable', distribution_target_table,
    'targetIdColumn', distribution_target_id_column,
    'ownerColumn', distribution_owner_column
  )
FROM public.system_segments
WHERE distribution_target_table IS NOT NULL
  AND distribution_target_id_column IS NOT NULL
  AND distribution_owner_column IS NOT NULL
ON CONFLICT (segment_id, strategy_key) DO NOTHING;

-- TODOS os segmentos (com ou sem owner_of_asset) sempre tiveram a cascata geográfica +
-- plantonista rodando hardcoded — preserva esse comportamento exato pra cada um, sem exceção.
INSERT INTO public.segment_distribution_strategies (segment_id, strategy_key, priority)
SELECT id, 'geo_area', 2 FROM public.system_segments
ON CONFLICT (segment_id, strategy_key) DO NOTHING;

INSERT INTO public.segment_distribution_strategies (segment_id, strategy_key, priority)
SELECT id, 'plantonista_fallback', 3 FROM public.system_segments
ON CONFLICT (segment_id, strategy_key) DO NOTHING;

-- As 3 colunas ficam obsoletas (substituídas pelo config da estratégia owner_of_asset) — foram
-- adicionadas nesta mesma sessão, sem nenhum outro código ou dado de produção dependendo delas
-- além do que a própria sessão escreveu, então removê-las agora não é uma migração "destrutiva"
-- no sentido do CLAUDE.md (não quebra nada existente fora deste trabalho). distribution_role_name
-- fica — é parâmetro transversal (nome do cargo), usado por todas as estratégias, não específico
-- de uma etapa.
ALTER TABLE public.system_segments
  DROP COLUMN IF EXISTS distribution_target_table,
  DROP COLUMN IF EXISTS distribution_target_id_column,
  DROP COLUMN IF EXISTS distribution_owner_column;

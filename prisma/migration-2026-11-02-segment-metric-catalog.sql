-- Catálogo de Métricas Dinâmico — Fase 1 (schema + curadoria do Master)
-- Ver docs/CHECKPOINT.md "Tarefa em andamento" (2026-11-02) pro desenho completo das 4 fases.
--
-- Metadado de métrica por segmento: substitui, aos poucos, o conjunto fixo e hardcoded de
-- colunas em campanhasmarketingdigital."Insight" por uma lista curável pelo Master. O schema de
-- `Insight` NÃO é alterado nesta migração (isso é Fase 2) — aqui só o metadado nasce.
--
-- Mesmo padrão de public.system_benchmarks (segment_id + metric_key free-text, sem FK rígida —
-- benchmark_key abaixo referencia system_benchmarks.metric_key do MESMO segmento por convenção,
-- nunca por FK, já que o resolver de benchmark já funciona por string key em runtime).

CREATE TABLE IF NOT EXISTS campanhasmarketingdigital.segment_metric_catalog (
  id               BIGSERIAL PRIMARY KEY,
  segment_id       UUID NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  metric_key       VARCHAR(100) NOT NULL,  -- identificador interno estável (ex: 'ctr', 'video_p75')
  meta_field       VARCHAR(200) NOT NULL,  -- campo real pedido na Meta Insights API (ex: 'ctr',
                                            -- 'actions', 'video_p75_watched_actions')
  label            VARCHAR(120) NOT NULL,  -- rótulo em PT-BR pro card/gráfico/LLM
  unit             VARCHAR(20)  NOT NULL DEFAULT 'count'
                     CHECK (unit IN ('currency','percent','count','ratio','score')),
  better_direction VARCHAR(20)  NOT NULL DEFAULT 'higher_is_better'
                     CHECK (better_direction IN ('higher_is_better','lower_is_better','neutral')),
  chart_type       VARCHAR(10)  NOT NULL DEFAULT 'line'
                     CHECK (chart_type IN ('area','line','bar')),
  category         VARCHAR(30)  NOT NULL DEFAULT 'desempenho'
                     CHECK (category IN ('desempenho','diagnostico','engajamento','conversoes','configuracoes')),
  benchmark_key    VARCHAR(100),           -- opcional, casa com system_benchmarks.metric_key do mesmo segmento
  is_kpi_card      BOOLEAN      NOT NULL DEFAULT false,  -- promove a card no topo do dashboard (Fase 1-3)
  sort_order       SMALLINT     NOT NULL DEFAULT 0,
  is_active        BOOLEAN      NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (segment_id, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_segment_metric_catalog_segment
  ON campanhasmarketingdigital.segment_metric_catalog (segment_id, is_active);

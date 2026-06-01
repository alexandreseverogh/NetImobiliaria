-- =============================================================================
-- FASE 8.5 — Signal-Driven Anticipation
-- Data: 2026-06-01
-- Descrição: persiste sinais de diagnóstico do Meta (rankings, learning,
--            first_impression_ratio) no Insight diário + tabela de snapshot
--            CalibrationSignal para auditoria e cache do painel.
--
-- NOTE: cpm e frequency JÁ EXISTEM no Insight — não recriar.
-- =============================================================================

-- 1. Estender Insight com sinais de diagnóstico
ALTER TABLE campanhasmarketingdigital."Insight"
  ADD COLUMN IF NOT EXISTS quality_ranking         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS engagement_rate_ranking VARCHAR(20),
  ADD COLUMN IF NOT EXISTS conversion_rate_ranking VARCHAR(20),
  ADD COLUMN IF NOT EXISTS learning_status         VARCHAR(20),
  ADD COLUMN IF NOT EXISTS learning_conversions    INTEGER,
  ADD COLUMN IF NOT EXISTS first_impression_ratio  DOUBLE PRECISION;

-- 2. Índice parcial: busca por campanhas com sinal de ranking configurado
CREATE INDEX IF NOT EXISTS idx_insight_signals
  ON campanhasmarketingdigital."Insight" (campaign_id, date DESC)
  WHERE quality_ranking IS NOT NULL
     OR engagement_rate_ranking IS NOT NULL;

-- 3. Tabela de snapshot de calibração (cache do painel + auditoria)
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."CalibrationSignal" (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL,
  client_id      UUID,
  campaign_id    TEXT NOT NULL,
  ad_id          TEXT,
  adset_id       TEXT,
  pressure_score INTEGER NOT NULL,
  signals        JSONB NOT NULL,
  recommendation JSONB,
  anticipation   JSONB,
  source         VARCHAR(20) NOT NULL DEFAULT 'META_SIGNAL',
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_signal
  ON campanhasmarketingdigital."CalibrationSignal" (tenant_id, campaign_id, created_at DESC);

-- 4. Seeds benchmarks de sinal em public.system_benchmarks
-- (pesos de pressão, limiares de frequência/CPM/learning por segmento)
INSERT INTO public.system_benchmarks
  (segment_id, benchmark_key, benchmark_value, notes)
SELECT
  s.id,
  b.key,
  b.val,
  b.notes
FROM public.system_segments s
CROSS JOIN (VALUES
  -- Pesos de pressão do sinal (somam 1.0)
  ('pressure_w_engagement', 0.40::numeric, 'Peso do engagement_rate_ranking na pressão'),
  ('pressure_w_conversion',  0.35::numeric, 'Peso do conversion_rate_ranking na pressão'),
  ('pressure_w_quality',     0.25::numeric, 'Peso do quality_ranking na pressão'),
  -- Limiares de tendência
  ('cpm_delta_max',          0.20::numeric, 'Δ% CPM acima disto é alarme (20%)'),
  ('frequency_max',          4.00::numeric, 'Frequência máxima antes da fadiga'),
  -- Parâmetros de learning
  ('learning_conv_target',   50::numeric,   'Conversões Meta p/ sair do learning'),
  -- Esgotamento de audiência
  ('fir_floor',              0.20::numeric, 'first_impression_ratio mínimo saudável')
) AS b(key, val, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_benchmarks sb
  WHERE sb.segment_id = s.id AND sb.benchmark_key = b.key
);

-- FASE 1 (Google Ads) — correção de nome de campo em network_defaults.google
-- "is_budget_lost_threshold_pct" (nome da 1ª versão da migração A5) conflava 2 conceitos
-- diferentes: o limiar do Agente de Negativação (A6, gasto sem conversão POR TERMO) e o
-- limiar da regra IMPRESSION_SHARE_OPPORTUNITY (A6, IS Lost Budget da CAMPANHA). Renomeado
-- para "negation_spend_threshold_pct" (só o 1º conceito) — o 2º vive em system_benchmarks
-- (mesmo padrão já usado por hook_rate_min/cpl_ideal), não em network_defaults.

UPDATE public.system_segments
SET network_defaults = jsonb_set(
  network_defaults #- '{google,is_budget_lost_threshold_pct}',
  '{google,negation_spend_threshold_pct}',
  '8'::jsonb
)
WHERE slug = 'imobiliaria';

UPDATE public.system_segments
SET network_defaults = jsonb_set(
  network_defaults #- '{google,is_budget_lost_threshold_pct}',
  '{google,negation_spend_threshold_pct}',
  '8'::jsonb
)
WHERE slug = 'carros';

UPDATE public.system_segments
SET network_defaults = jsonb_set(
  network_defaults #- '{google,is_budget_lost_threshold_pct}',
  '{google,negation_spend_threshold_pct}',
  '10'::jsonb
)
WHERE slug = 'geral';

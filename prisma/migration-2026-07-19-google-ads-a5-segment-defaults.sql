-- FASE 1 (Google Ads) — A5: network_defaults.google por segmento (curadoria multi-vertical)
-- Ver docs/PLANO_GOOGLE_TIKTOK.md. Merge aditivo (||) — preserva network_defaults.meta já existente.

-- Imobiliário
UPDATE public.system_segments
SET network_defaults = network_defaults || '{
  "google": {
    "campaign_types": ["SEARCH", "PERFORMANCE_MAX"],
    "bidding_strategy": "MAXIMIZE_CONVERSIONS",
    "headline_max_chars": 30,
    "description_max_chars": 90,
    "negative_seed_terms": ["grátis", "gratuito", "curso", "como ser corretor", "salário corretor", "aluguel"],
    "impression_share_target": 80,
    "is_budget_lost_threshold_pct": 15
  }
}'::jsonb
WHERE slug = 'imobiliaria';

-- Venda de Carros
UPDATE public.system_segments
SET network_defaults = network_defaults || '{
  "google": {
    "campaign_types": ["SEARCH", "PERFORMANCE_MAX"],
    "bidding_strategy": "MAXIMIZE_CONVERSIONS",
    "headline_max_chars": 30,
    "description_max_chars": 90,
    "negative_seed_terms": ["grátis", "peças usadas", "sucata", "curso de mecânica", "carro roubado"],
    "impression_share_target": 75,
    "is_budget_lost_threshold_pct": 15
  }
}'::jsonb
WHERE slug = 'carros';

-- Geral (fallback genérico, sem curadoria de nicho)
UPDATE public.system_segments
SET network_defaults = network_defaults || '{
  "google": {
    "campaign_types": ["SEARCH", "PERFORMANCE_MAX"],
    "bidding_strategy": "MAXIMIZE_CONVERSIONS",
    "headline_max_chars": 30,
    "description_max_chars": 90,
    "negative_seed_terms": ["grátis", "gratuito", "reclame aqui", "curso"],
    "impression_share_target": 70,
    "is_budget_lost_threshold_pct": 20
  }
}'::jsonb
WHERE slug = 'geral';

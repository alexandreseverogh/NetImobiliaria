-- ============================================================
-- FASE 14b — Prompt angle_performance_insight
-- 2026-06-03
-- Prompt para análise de ângulo de comunicação no briefing.
-- Segue princípio ZERO HARDCODE: prompt vive no DB, não no código.
-- Variáveis: period_days, angle_stats, top_angle, worst_angle
-- ============================================================

INSERT INTO public.system_prompt_templates
  (id, segment_id, template_key, version, title, content, variables, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  NULL,
  'angle_performance_insight',
  1,
  'Análise de Ângulo de Comunicação',
  $PROMPT$Você é especialista sênior em marketing imobiliário digital.

DADOS DE PERFORMANCE POR ÂNGULO — últimos {{period_days}} dias:
{{angle_stats}}

Ângulo vencedor (menor CPL): {{top_angle}}
Ângulo com pior desempenho: {{worst_angle}}

Em 2-3 frases diretas e práticas:
1. Indique o padrão mais relevante que os dados revelam sobre qual ângulo ressoa melhor com o público.
2. Recomende a ação prioritária (ex: realocar budget, testar novo criativo, pausar ângulo fraco).
Seja objetivo e orientado a resultado.$PROMPT$,
  '["period_days","angle_stats","top_angle","worst_angle"]'::jsonb,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_prompt_templates WHERE template_key = 'angle_performance_insight'
);

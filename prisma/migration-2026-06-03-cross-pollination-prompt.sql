-- ============================================================
-- FASE 10 — Prompt cross_pollination_insights
-- 2026-06-03
-- Migra prompt hardcoded do route.ts para system_prompt_templates
-- seguindo o princípio ZERO HARDCODE do plano mestre.
-- ============================================================

INSERT INTO public.system_prompt_templates
  (id, segment_id, template_key, version, title, content, variables, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  NULL,   -- global (sem segmento específico)
  'cross_pollination_insights',
  1,
  'Cross-Pollination — Narrativa de Portfólio',
  $PROMPT$Você é um especialista sênior em tráfego pago gerenciando um portfólio de {{total_clients}} clientes.

DADOS DO PERÍODO ({{period}} dias):
{{top_performers}}

ALERTAS CRÍTICOS:
{{critical_alerts}}

PADRÕES IDENTIFICADOS:
{{patterns}}

Em 3-4 frases concisas, destaque o padrão mais relevante para transferência entre clientes e a ação prioritária desta semana. Seja direto e prático.$PROMPT$,
  '["total_clients","period","top_performers","critical_alerts","patterns"]'::jsonb,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_prompt_templates WHERE template_key = 'cross_pollination_insights'
);

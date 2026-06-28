-- Migration: FASE 16 — Parametrização da EXECUÇÃO de budget por segmento
-- Substitui o hardcode +30% (SCALE) / -30% (DOWNSCALE) do agentDecisor.ts
-- por valores resolvidos via system_benchmarks (zero hardcode).
-- Data: 2026-06-23
--
-- Defaults semeados (30/30/sem teto) PRESERVAM o comportamento atual.
-- Cada segmento deve ter seus números reais ajustados na UI de configuração.

INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
SELECT s.id, v.metric_key, v.metric_label, v.value, v.unit, v.description
FROM public.system_segments s
CROSS JOIN (VALUES
  ('scale_budget_pct',     'Escala de Budget (%)',  30, 'PCT', 'Percentual de aumento do budget diário ao ESCALAR (após aprovação humana)'),
  ('downscale_budget_pct', 'Redução de Budget (%)', 30, 'PCT', 'Percentual de redução do budget diário ao REDUZIR (defensivo, automático)'),
  ('scale_budget_max',     'Teto de Budget (R$)',    0, 'BRL', 'Teto de budget diário por adset ao escalar (0 = sem teto)')
) AS v(metric_key, metric_label, value, unit, description)
ON CONFLICT (segment_id, metric_key) DO NOTHING;

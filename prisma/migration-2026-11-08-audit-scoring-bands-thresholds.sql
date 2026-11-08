-- Limiares de decisão de problemas/oportunidades da auditoria (complemento de
-- migration-2026-11-08-audit-scoring-bands). Valores atuais do código. Idempotente.

INSERT INTO campanhasmarketingdigital.audit_scoring_bands
  (segment_id, dimension, rule_key, sort_order, comparison, bound_value, score, label)
SELECT s.id, v.dimension, v.rule_key, v.sort_order, 'any', NULL, v.score, v.label
FROM public.system_segments s
CROSS JOIN (VALUES
  ('problem','trigger_min',          1, 50::numeric, 'Nota abaixo disto vira problema (tracking e criativo)'),
  ('problem','tracking_high_below',  1, 30::numeric, 'Nota de tracking abaixo disto é impacto alto'),
  ('problem','waste_high_brl',       1, 500::numeric,'Desperdício acima disto (R$) é impacto alto'),
  ('opportunity','tracking_below',   1, 80::numeric, 'Nota de tracking abaixo disto gera oportunidade')
) AS v(dimension, rule_key, sort_order, score, label)
ON CONFLICT (segment_id, dimension, rule_key, sort_order) DO NOTHING;

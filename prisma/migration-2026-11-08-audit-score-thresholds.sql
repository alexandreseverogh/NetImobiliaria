-- Cortes de score da auditoria (status ok/atenção/crítico) saíam do código.
-- Valores iguais aos que o código usava. Idempotente.
--   audit_score_ok_min    : score >= isto é "ok" (verde)            — era 70
--   audit_score_warn_min  : score >= isto é "atenção" (âmbar)        — era 45
--   audit_score_spend_warn_min : corte de atenção de "Eficiência de Verba" — era 40 (único corte diferente)

INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
SELECT s.id, v.k, v.label, v.val, 'score', v.descr
FROM public.system_segments s
CROSS JOIN (VALUES
  ('audit_score_ok_min', 'Auditoria: corte de "saudável"', 70::numeric,
   'Score de auditoria a partir do qual a dimensão é considerada saudável (ok). Valor atual: 70.'),
  ('audit_score_warn_min', 'Auditoria: corte de "atenção"', 45::numeric,
   'Score de auditoria a partir do qual a dimensão está em atenção; abaixo disto é crítico. Valor atual: 45.'),
  ('audit_score_spend_warn_min', 'Auditoria: corte de atenção em Eficiência de Verba', 40::numeric,
   'Corte de atenção só da dimensão Eficiência de Verba (as demais usam o corte de atenção geral). Valor atual do código: 40.')
) AS v(k, label, val, descr)
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_benchmarks b
  WHERE b.segment_id = s.id AND b.metric_key = v.k AND b.network_id IS NULL
);

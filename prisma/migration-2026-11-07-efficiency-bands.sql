-- Faixas de eficiência do cross-insights e fator de "CPL bom" (plano REGRAS_CONFIGURAVEIS §4.1).
-- Antes estavam escritos no código (0,6 / 1 / 1,5 / 0,85). Valores iguais aos que o código usava.
-- Idempotente.

INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
SELECT s.id, v.k, v.label, v.val, 'ratio', v.descr
FROM public.system_segments s
CROSS JOIN (VALUES
  ('efficiency_good_max', 'Eficiência: limite de "ótimo"', 0.6::numeric,
   'Índice CPL ÷ CPL crítico abaixo disto é ótimo (verde). Valor atual do código: 0,6.'),
  ('efficiency_warn_max', 'Eficiência: limite de "atenção"', 1.0::numeric,
   'Índice CPL ÷ CPL crítico abaixo disto é atenção (âmbar); igual ou acima é crítico. Valor atual: 1.'),
  ('efficiency_bar_max', 'Eficiência: escala da barra', 1.5::numeric,
   'Índice acima disto preenche a barra inteira. Valor atual do código: 1,5.'),
  ('good_cpl_factor', 'Fator de "CPL bom"', 0.85::numeric,
   'CPL abaixo de ideal × este fator é considerado bom na inteligência de segmento. Valor atual: 0,85.')
) AS v(k, label, val, descr)
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_benchmarks b
  WHERE b.segment_id = s.id AND b.metric_key = v.k AND b.network_id IS NULL
);

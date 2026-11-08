-- Fator de alerta de CPL (decisão aprovada: 1,15). CPL > cpl_ideal × warn_cpl_factor = warn.
INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
SELECT s.id, 'warn_cpl_factor', 'Fator de alerta de CPL', 1.15::numeric, 'ratio',
       'CPL acima de ideal × este fator dispara alerta (warn). Abaixo do crítico. Aprovado em 2026-11-07.'
FROM public.system_segments s
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_benchmarks b
  WHERE b.segment_id = s.id AND b.metric_key = 'warn_cpl_factor' AND b.network_id IS NULL
);

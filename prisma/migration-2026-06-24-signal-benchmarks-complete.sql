-- Migration 2026-06-24b: Semeia benchmarks do signal engine para todos os segmentos.
-- Esses parâmetros são específicos por segmento de negócio:
--   clínicas têm realidade de CPM e conversão completamente diferente de revendas de carros.
-- ON CONFLICT DO NOTHING preserva valores já customizados.

INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
SELECT s.id, v.metric_key, v.metric_label, v.value, v.unit, v.description
FROM public.system_segments s
CROSS JOIN (VALUES
  ('cpm_delta_max',         'CPM Delta Máx (%)',                  0.20, 'PCT', 'Variação % de CPM acima disto dispara alerta de custo'),
  ('fir_floor',             'First Impression Ratio Mín',          0.20, 'NUM', 'Proporção mínima de impressões únicas saudável'),
  ('learning_conv_target',  'Conversões p/ Sair do Learning',      50,   'NUM', 'Conversões que o Meta exige para encerrar aprendizado'),
  ('pressure_w_engagement', 'Peso Engagement (Pressão)',           0.40, 'NUM', 'Peso do engagement_rate_ranking no índice de pressão'),
  ('pressure_w_conversion', 'Peso Conversão (Pressão)',            0.35, 'NUM', 'Peso do conversion_rate_ranking no índice de pressão'),
  ('pressure_w_quality',    'Peso Qualidade (Pressão)',            0.25, 'NUM', 'Peso do quality_ranking no índice de pressão')
) AS v(metric_key, metric_label, value, unit, description)
ON CONFLICT (segment_id, metric_key) DO NOTHING;

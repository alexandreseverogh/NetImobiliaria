-- T4 (docs/PLANO_TIKTOK.md §8.5) — seed dos 5 benchmarks novos do motor de realocação
-- cross-rede, pra TODOS os segmentos ativos (mesmo padrão dos demais 21 metric_keys já
-- seedados por segmento). Idempotente — ON CONFLICT DO NOTHING, index já existe
-- (system_benchmarks_seg_metric_net_key, aplicado em T0).

INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
SELECT s.id, m.metric_key, m.metric_label, m.value, m.unit, m.description
FROM public.system_segments s
CROSS JOIN (VALUES
  ('realloc_min_cpl_gap_pct',      'Vantagem Mín. p/ Realocar (%)',    30,   'PCT', 'Diferença de CPL entre origem e destino, mínima pra propor realocação'),
  ('realloc_max_pct_of_source',    'Teto de Retirada da Origem (%)',   30,   'PCT', 'Máximo do budget da origem que pode ser realocado numa proposta'),
  ('realloc_marginal_haircut_pct', 'Desconto Marginal (%)',            25,   'PCT', 'Degradação esperada do CPL do destino ao receber verba extra — protege contra superestimar o ganho'),
  ('realloc_max_abs_cents',        'Teto Absoluto por Proposta (R$)',  5000, 'BRL', 'Valor máximo diário realocável numa única proposta'),
  ('realloc_cooldown_days',        'Cooldown entre Propostas (dias)',  14,   'NUM', 'Dias sem repetir proposta pro mesmo par origem→destino')
) AS m(metric_key, metric_label, value, unit, description)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid))
DO NOTHING;

-- Migration 2026-06-24: Semeia benchmarks de DETECÇÃO em system_benchmarks para todos os segmentos.
-- Garante que todos os 13 metric_keys usados pelo agente existam para todos os segmentos.
-- ON CONFLICT DO NOTHING preserva valores já customizados por segmento.

INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
SELECT
  s.id,
  v.metric_key,
  v.metric_label,
  v.value,
  v.unit,
  v.description
FROM public.system_segments s
CROSS JOIN (VALUES
  ('cpl_ideal',          'CPL Ideal (R$)',              30,   'BRL', 'CPL considerado bom — base para sugerir escala'),
  ('cpl_critical',       'CPL Crítico (R$)',            80,   'BRL', 'CPL acima disto → pausa ou redução de budget'),
  ('ctr_min',            'CTR Mínimo (%)',               1.0,  'PCT', 'CTR abaixo disto indica criativo fraco'),
  ('ctr_scale',          'CTR p/ Escalar (%)',           2.0,  'PCT', 'CTR excelente → agente sugere SCALE'),
  ('frequency_max',      'Frequência Máxima',            3.0,  'NUM', 'Acima disto a audiência está saturada'),
  ('spend_no_lead',      'Gasto sem Lead (R$)',          50,   'BRL', 'Gasto máximo sem nenhum lead antes de pausar'),
  ('min_leads_scale',    'Leads Mín. p/ Escalar',        5,    'NUM', 'Mínimo de leads no período para recomendar escala'),
  ('min_days_running',   'Dias Mín. Rodando',            3,    'NUM', 'Dias mínimos de campanha antes de qualquer avaliação'),
  ('hook_rate_critical', 'Hook Rate Crítico (%)',        8,    'PCT', 'Hook rate abaixo disto → criativo de vídeo ruim'),
  ('hook_rate_min',      'Hook Rate Mínimo (%)',        12,    'PCT', 'Hook rate mínimo aceitável para vídeos'),
  ('hook_rate_good',     'Hook Rate Bom (%)',           22,    'PCT', 'A partir daqui o vídeo tem boa retenção'),
  ('scale_budget_pct',   'Escala de Budget (%)',        30,    'PCT', '% de aumento do budget ao escalar (após aprovação)'),
  ('downscale_budget_pct','Redução de Budget (%)',      30,    'PCT', '% de redução do budget ao downscalar (defensivo)'),
  ('scale_budget_max',   'Teto de Budget (R$)',          0,    'BRL', 'Teto diário por adset ao escalar (0 = sem teto)')
) AS v(metric_key, metric_label, value, unit, description)
ON CONFLICT (segment_id, metric_key) DO NOTHING;

-- Faixas de pontuação da auditoria de campanhas (plano REGRAS_CONFIGURAVEIS — opção 2).
-- Substitui os números fixos de auditReportService (pesos, notas, faixas de CPL/desperdício/
-- funil/criativo, cortes de status). Seed com os valores atuais do código, por segmento.
-- Idempotente.
--
-- Modelo:
--   dimension  : dimensão do scorecard (performance, spend_efficiency, funnel_health,
--                tracking, creative), ou 'reference' (fallback de benchmark) / 'opportunity'.
--   rule_key   : conjunto de faixas dentro da dimensão (ex.: cpl_ratio, waste_pct).
--   sort_order : ordem de avaliação — a primeira faixa que casa vence.
--   comparison : lte | lt | gte | gt | any ('any' = faixa de fallback, sem limite).
--   bound_value: limite. Para razões (CPL ÷ ideal, CTR ÷ mínimo) é o múltiplo.
--   score      : nota (ou peso, corte de status, valor de referência, conforme rule_key).

CREATE TABLE IF NOT EXISTS campanhasmarketingdigital.audit_scoring_bands (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id  UUID NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  dimension   VARCHAR(40) NOT NULL,
  rule_key    VARCHAR(60) NOT NULL,
  sort_order  INTEGER NOT NULL,
  comparison  VARCHAR(4)  NOT NULL CHECK (comparison IN ('lte','lt','gte','gt','any')),
  bound_value NUMERIC(12,4),
  score       NUMERIC(8,2) NOT NULL,
  label       VARCHAR(200),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT audit_bands_unique UNIQUE (segment_id, dimension, rule_key, sort_order),
  CONSTRAINT audit_bands_bound_ck CHECK (
    (comparison = 'any' AND bound_value IS NULL) OR (comparison <> 'any' AND bound_value IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_audit_bands_segment ON campanhasmarketingdigital.audit_scoring_bands (segment_id, rule_key);

INSERT INTO campanhasmarketingdigital.audit_scoring_bands
  (segment_id, dimension, rule_key, sort_order, comparison, bound_value, score, label)
SELECT s.id, v.dimension, v.rule_key, v.sort_order, v.comparison, v.bound_value, v.score, v.label
FROM public.system_segments s
CROSS JOIN (VALUES
  -- Referências de fallback (usadas só quando o benchmark do segmento não existe)
  ('reference','cpl_ideal',          1,'any',NULL::numeric, 50::numeric,  'CPL ideal de fallback'),
  ('reference','cpl_critical',       1,'any',NULL,          999,          'CPL crítico de fallback'),
  ('reference','ctr_min',            1,'any',NULL,          1.5,          'CTR mínimo de fallback'),
  ('reference','frequency_max',      1,'any',NULL,          3.5,          'Frequência máxima de fallback'),
  ('reference','hook_rate_critical', 1,'any',NULL,          8,            'Hook rate crítico de fallback'),

  -- Performance (CPL ÷ CPL ideal)
  ('performance','weight',          1,'any',NULL, 30,  'Peso da dimensão'),
  ('performance','status_ok_min',   1,'any',NULL, 70,  'Nota mínima para "saudável"'),
  ('performance','status_warn_min', 1,'any',NULL, 45,  'Nota mínima para "atenção"'),
  ('performance','base',            1,'any',NULL, 60,  'Sem dados suficientes'),
  ('performance','no_leads',        1,'any',NULL, 10,  'Gasto sem nenhum lead'),
  ('performance','cpl_ratio',       1,'lte',1,    90,  'CPL até o ideal'),
  ('performance','cpl_ratio',       2,'lte',1.5,  70,  'CPL ligeiramente acima do ideal'),
  ('performance','cpl_ratio',       3,'lte',2.5,  45,  'CPL em atenção'),
  ('performance','cpl_ratio',       4,'any',NULL, 20,  'CPL crítico'),

  -- Eficiência de verba (% do gasto em desperdício)
  ('spend_efficiency','weight',          1,'any',NULL, 25, 'Peso da dimensão'),
  ('spend_efficiency','status_ok_min',   1,'any',NULL, 70, 'Nota mínima para "saudável"'),
  ('spend_efficiency','status_warn_min', 1,'any',NULL, 40, 'Nota mínima para "atenção"'),
  ('spend_efficiency','base',            1,'any',NULL, 80, 'Sem dados de desperdício'),
  ('spend_efficiency','waste_pct',       1,'lte',0,    95, 'Nenhum desperdício'),
  ('spend_efficiency','waste_pct',       2,'lte',10,   80, 'Desperdício dentro do aceitável'),
  ('spend_efficiency','waste_pct',       3,'lte',25,   55, 'Desperdício recuperável'),
  ('spend_efficiency','waste_pct',       4,'lte',50,   30, 'Desperdício em risco alto'),
  ('spend_efficiency','waste_pct',       5,'any',NULL, 10, 'Desperdício crítico'),

  -- Saúde do funil (CTR, lead rate, conversão)
  ('funnel_health','weight',          1,'any',NULL, 20,   'Peso da dimensão'),
  ('funnel_health','status_ok_min',   1,'any',NULL, 70,   'Nota mínima para "saudável"'),
  ('funnel_health','status_warn_min', 1,'any',NULL, 45,   'Nota mínima para "atenção"'),
  ('funnel_health','base',            1,'any',NULL, 60,   'Sem dados suficientes'),
  ('funnel_health','weight_tof',      1,'any',NULL, 0.35, 'Peso do CTR (topo)'),
  ('funnel_health','weight_mof',      1,'any',NULL, 0.35, 'Peso do lead rate (meio)'),
  ('funnel_health','weight_bof',      1,'any',NULL, 0.30, 'Peso da conversão (fundo)'),
  ('funnel_health','ctr_ratio',       1,'gte',2,    100,  'CTR ≥ 2× o mínimo'),
  ('funnel_health','ctr_ratio',       2,'gte',1,    70,   'CTR ≥ mínimo'),
  ('funnel_health','ctr_ratio',       3,'gt', 0,    35,   'CTR abaixo do mínimo'),
  ('funnel_health','ctr_ratio',       4,'any',NULL, 50,   'Sem CTR'),
  ('funnel_health','lead_rate',       1,'gte',5,    100,  'Lead rate ≥ 5%'),
  ('funnel_health','lead_rate',       2,'gte',2,    70,   'Lead rate ≥ 2%'),
  ('funnel_health','lead_rate',       3,'gt', 0,    35,   'Lead rate abaixo de 2%'),
  ('funnel_health','lead_rate',       4,'any',NULL, 50,   'Sem lead rate'),
  ('funnel_health','conv_rate',       1,'gte',3,    100,  'Conversão ≥ 3%'),
  ('funnel_health','conv_rate',       2,'gte',1,    70,   'Conversão ≥ 1%'),
  ('funnel_health','conv_rate',       3,'gt', 0,    35,   'Conversão abaixo de 1%'),
  ('funnel_health','conv_rate',       4,'any',NULL, 50,   'Sem conversão'),

  -- Rastreamento (a nota vem do health check; fallback se não houver)
  ('tracking','weight',          1,'any',NULL, 15, 'Peso da dimensão'),
  ('tracking','status_ok_min',   1,'any',NULL, 70, 'Nota mínima para "saudável"'),
  ('tracking','status_warn_min', 1,'any',NULL, 45, 'Nota mínima para "atenção"'),
  ('tracking','fallback',        1,'any',NULL, 50, 'Sem health check disponível'),

  -- Saúde criativa (frequência e hook rate)
  ('creative','weight',          1,'any',NULL, 10,  'Peso da dimensão'),
  ('creative','status_ok_min',   1,'any',NULL, 70,  'Nota mínima para "saudável"'),
  ('creative','status_warn_min', 1,'any',NULL, 45,  'Nota mínima para "atenção"'),
  ('creative','base',            1,'any',NULL, 65,  'Sem métricas de criativo'),
  ('creative','weight_freq',     1,'any',NULL, 0.6, 'Peso da frequência'),
  ('creative','weight_hook',     1,'any',NULL, 0.4, 'Peso do hook rate'),
  ('creative','freq_ratio',      1,'lte',1,    90,  'Frequência dentro do máximo'),
  ('creative','freq_ratio',      2,'lte',1.5,  55,  'Frequência até 1,5× o máximo'),
  ('creative','freq_ratio',      3,'any',NULL, 20,  'Frequência saturada'),
  ('creative','hook_ratio',      1,'lte',0,    60,  'Sem hook rate'),
  ('creative','hook_ratio',      2,'gte',1.5,  90,  'Hook rate ≥ 1,5× o crítico'),
  ('creative','hook_ratio',      3,'gte',1,    60,  'Hook rate ≥ crítico'),
  ('creative','hook_ratio',      4,'any',NULL, 25,  'Hook rate abaixo do crítico'),

  -- Oportunidades
  ('opportunity','ctr_factor',   1,'any',NULL, 2,   'Múltiplo do CTR mínimo para a meta de oportunidade')
) AS v(dimension, rule_key, sort_order, comparison, bound_value, score, label)
ON CONFLICT (segment_id, dimension, rule_key, sort_order) DO NOTHING;

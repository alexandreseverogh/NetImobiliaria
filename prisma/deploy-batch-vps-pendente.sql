-- LOTE DE DEPLOY VPS — tudo que NÃO foi aplicado na VPS desde 2026-11-06.
-- Aplicar em prod_db e staging_db ANTES de subir o código novo.
-- Ordem: a de cada arquivo abaixo (dependências internas já respeitadas).
-- PRÉ-REQUISITO: migration-2026-11-05-metric-catalog-tenant-client-cascade.sql deve já estar
-- na VPS (o seed de métricas de 11-06 depende dela). Confirmar antes de rodar.
BEGIN;

-- ===== migration-2026-11-06-parametros-imoveis-seed-all-tenants.sql =====
-- Fase 0 (regras configuráveis): todo tenant precisa de sua linha em parametros_imoveis.
-- Antes, o DistributionEngine caía em valores fixos no código quando a linha faltava (10 dos 12
-- tenants ativos não tinham linha). Esta migração cria a linha com os DEFAULTS da própria
-- tabela, então o comportamento de roteamento não muda para ninguém. Idempotente.
INSERT INTO public.parametros_imoveis (tenant_id)
SELECT t.id
  FROM public.tenants t
 WHERE NOT EXISTS (
   SELECT 1 FROM public.parametros_imoveis p WHERE p.tenant_id = t.id
 )
ON CONFLICT (tenant_id) DO NOTHING;

-- ===== migration-2026-11-06-seed-marketing-digital-metrics.sql =====
-- Catálogo de Métricas Dinâmico — seed das 19 métricas reais já curadas no ambiente local
-- para o segmento "Gestão de Marketing Digital" (slug: marketing-digital).
--
-- Rodar DEPOIS de migration-2026-11-05-metric-catalog-tenant-client-cascade.sql — depende das
-- colunas tenant_id/client_id e do índice parcial idx_smc_segment_unique já existirem (é o
-- arbiter do ON CONFLICT abaixo).
--
-- Idempotente: pode ser re-executado sem duplicar nem perder dado (replace por metric_key).
-- Resolve segment_id pelo SLUG (não por UUID literal) — mais seguro caso o segmento tenha sido
-- criado com um UUID diferente no banco do VPS.

INSERT INTO campanhasmarketingdigital.segment_metric_catalog
  (segment_id, metric_key, meta_field, label, unit, better_direction, chart_type, category,
   benchmark_key, action_type, is_kpi_card, sort_order, is_active)
SELECT ss.id, v.metric_key, v.meta_field, v.label, v.unit, v.better_direction, v.chart_type,
       v.category, v.benchmark_key, v.action_type, v.is_kpi_card, v.sort_order, true
  FROM public.system_segments ss
  JOIN (VALUES
    ('video_p25',               'video_p25_watched_actions',      'Reproduções 25% do vídeo',           'count',    'higher_is_better', 'bar',  'video',       NULL,         NULL,                            false, 0),
    ('post_engagement',         'actions',                        'Engajamentos com o post',             'count',    'higher_is_better', 'area', 'engajamento', NULL,         'post_engagement',               false, 1),
    ('reach',                   'reach',                          'Alcance',                              'count',    'higher_is_better', 'line', 'distribuicao',NULL,         NULL,                            false, 2),
    ('video_p95',               'video_p95_watched_actions',      'Reproduções 95% do vídeo',           'count',    'higher_is_better', 'bar',  'video',       NULL,         NULL,                            false, 3),
    ('video_avg_watch_time',    'video_avg_time_watched_actions',  'Tempo médio de reprodução do vídeo', 'count',    'higher_is_better', 'line', 'video',       NULL,         NULL,                            false, 4),
    ('quality_ranking',         'quality_ranking',                'Classificação de qualidade',          'score',    'higher_is_better', 'line', 'diagnostico', NULL,         NULL,                            false, 5),
    ('engagement_rate_ranking', 'engagement_rate_ranking',        'Classificação de engajamento',        'score',    'higher_is_better', 'line', 'diagnostico', NULL,         NULL,                            false, 6),
    ('conversion_rate_ranking', 'conversion_rate_ranking',        'Classificação de conversão',          'score',    'higher_is_better', 'line', 'diagnostico', NULL,         NULL,                            false, 7),
    ('view_content',            'actions',                        'Visualizações de conteúdo',           'count',    'higher_is_better', 'bar',  'conversoes',  NULL,         'omni_view_content',             false, 8),
    ('purchase_roas',           'purchase_roas',                  'ROAS de compras',                      'ratio',    'higher_is_better', 'line', 'conversoes',  NULL,         NULL,                            false, 9),
    ('subscribe',               'actions',                        'Assinaturas',                          'count',    'higher_is_better', 'bar',  'conversoes',  NULL,         'subscribe_total',               false, 10),
    ('submit_application',      'actions',                        'Inscrições enviadas',                  'count',    'higher_is_better', 'bar',  'conversoes',  NULL,         'submit_application_total',      false, 11),
    ('cost_per_lead',           'cost_per_action_type',           'Custo por lead',                       'currency', 'lower_is_better',  'line', 'conversoes',  'cpl_ideal',  'lead',                          true,  12),
    ('inline_link_clicks',      'inline_link_clicks',             'Cliques no link',                      'count',    'higher_is_better', 'bar',  'cliques',     NULL,         NULL,                            false, 13),
    ('inline_link_click_ctr',   'inline_link_click_ctr',          'CTR (taxa de cliques no link)',       'percent',  'higher_is_better', 'line', 'cliques',     NULL,         NULL,                            false, 14),
    ('website_purchase_roas',   'website_purchase_roas',          'ROAS de compras no site',             'ratio',    'higher_is_better', 'line', 'conversoes',  NULL,         NULL,                            false, 15),
    ('page_engagement',         'actions',                        'Engajamento com a Página',            'count',    'higher_is_better', 'bar',  'engajamento', NULL,         'page_engagement',               false, 16),
    ('cost_per_outbound_click', 'cost_per_outbound_click',        'Custo por clique de saída',           'currency', 'lower_is_better',  'line', 'cliques',     NULL,         NULL,                            false, 17),
    ('initiate_checkout',       'actions',                        'Finalizações de compra iniciadas',    'count',    'higher_is_better', 'bar',  'conversoes',  NULL,         'omni_initiated_checkout',       false, 18)
  ) AS v(metric_key, meta_field, label, unit, better_direction, chart_type, category, benchmark_key, action_type, is_kpi_card, sort_order)
    ON true
 WHERE ss.slug = 'marketing-digital'
ON CONFLICT (segment_id, metric_key) WHERE segment_id IS NOT NULL DO UPDATE SET
  meta_field = EXCLUDED.meta_field, label = EXCLUDED.label, unit = EXCLUDED.unit,
  better_direction = EXCLUDED.better_direction, chart_type = EXCLUDED.chart_type,
  category = EXCLUDED.category, benchmark_key = EXCLUDED.benchmark_key,
  action_type = EXCLUDED.action_type, is_kpi_card = EXCLUDED.is_kpi_card,
  sort_order = EXCLUDED.sort_order, is_active = true, updated_at = now();

-- ===== migration-2026-11-07-efficiency-bands.sql =====
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

-- ===== migration-2026-11-07-parametros-imoveis-permissions.sql =====
-- Corrige permissões da feature parametros_imoveis (id 54).
-- A rota /api/admin/parametros/imoveis exige READ (GET) e UPDATE (PUT), mas a feature só tinha
-- 'execute' para o perfil 42. Resultado: administradores de tenant recebiam 403 ao salvar a
-- chave PIX (a tela mostrava o erro e nada era persistido).
-- Idempotente: pode ser executada mais de uma vez.

INSERT INTO permissions (feature_id, action)
SELECT 54, a FROM (VALUES ('read'), ('update')) AS v(a)
ON CONFLICT (feature_id, action) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.role_id, p.id
FROM (VALUES (42), (47)) AS r(role_id)
JOIN permissions p ON p.feature_id = 54 AND p.action IN ('read', 'update')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ===== migration-2026-11-07-rules-core.sql =====
-- Fase 2 — Núcleo de regras (docs/PLANO_REGRAS_CONFIGURAVEIS.md §2.2).
-- Aditiva e idempotente. Nenhum consumidor usa estas chaves ainda: zero mudança de comportamento.

-- 1) Tabela de regras de decisão por segmento (§2.2.2). Vazia até a migração dos consumidores.
CREATE TABLE IF NOT EXISTS public.segment_decision_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id        uuid NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  rule_key          varchar(60) NOT NULL,
  is_active         boolean NOT NULL DEFAULT true,
  priority          integer NOT NULL DEFAULT 0,
  thresholds        jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_base   numeric(4,2),
  confidence_slope  numeric(4,2),
  confidence_cap    numeric(4,2),
  action_type       varchar(40),
  requires_approval boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT segment_decision_rules_unique UNIQUE (segment_id, rule_key)
);

-- 2) Chaves numéricas novas em system_benchmarks, uma linha por segmento.
--    Só chaves cujo valor atual foi verificado no código, ou chaves novas sem consumidor.
INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
SELECT s.id, v.k, v.label, v.val, v.unit, v.descr
FROM public.system_segments s
CROSS JOIN (VALUES
  ('cpl_critical_multiplier', 'Múltiplo do CPL crítico', 2.5::numeric, 'ratio', 'CPL acima de N vezes o ideal é crítico (DOWNSCALE). Valor atual do código: 2.5.'),
  ('realloc_window_days', 'Janela de realocação (dias)', 14::numeric, 'days', 'Janela de métricas para avaliar realocação. Valor atual do código: 14.'),
  ('realloc_circuit_threshold', 'Propostas BACKFIRED para desligar realocação', 3::numeric, 'count', 'Circuit breaker: N propostas BACKFIRED na janela desliga a sugestão. Valor atual: 3.'),
  ('realloc_circuit_window_days', 'Janela do circuit breaker (dias)', 90::numeric, 'days', 'Período de contagem do circuit breaker. Valor atual: 90.'),
  ('fit_public_weak_max', 'Fit máximo de lead fraco', 45::numeric, 'score', 'Fit abaixo disto indica ajuste de público. Novo, sem consumidor ainda.'),
  ('fit_queue_strong_min', 'Fit mínimo de lead forte', 65::numeric, 'score', 'Fit igual ou acima disto sobe na fila de atendimento. Novo, sem consumidor ainda.')
) AS v(k, label, val, unit, descr)
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_benchmarks b
  WHERE b.segment_id = s.id AND b.metric_key = v.k AND b.network_id IS NULL
);

-- ===== migration-2026-11-07-segment-required.sql =====
-- Segmento obrigatório para tenant (exceto Master Platform) e para cliente do tipo conta_gerenciada.
-- Consumidores PF (consumidor_pf) continuam sem segmento.
-- Decisões aprovadas em 2026-11-07. Idempotente.

-- 1) Preenchimento dos registros que hoje estão sem segmento.
UPDATE public.tenants
   SET segment_id = (SELECT id FROM public.system_segments WHERE slug = 'imobiliaria')
 WHERE id = 'c828d003-6213-4464-aa38-6c5d10a0aa9a' AND segment_id IS NULL;   -- Net Imobiliária

UPDATE public.clientes
   SET segment_id = (SELECT id FROM public.system_segments WHERE slug = 'marketing-digital')
 WHERE segment_id IS NULL AND tipo_cliente = 'conta_gerenciada'
   AND uuid IN ('f85178d9-88e5-42c4-8ee0-f829c1adff85',   -- Cliente Marcelo 1
                'da9f31ca-fe5e-49dc-8216-49d611d0ce24',   -- Cliente Marcelo 3
                'a3ad232d-9dad-4a85-9434-8b8336644f12',   -- Cliente de Marcelo
                'd1f06a24-c3d8-4104-9cd6-88122c0f0f52');  -- Frank Aguiar

UPDATE public.clientes
   SET segment_id = (SELECT id FROM public.system_segments WHERE slug = 'carros')
 WHERE uuid = '4fd85c83-b362-4597-850d-e7361f6e9359' AND segment_id IS NULL;  -- Old Cars

-- 2) Regras no banco. Master Platform é isento.
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_segment_required;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_segment_required
  CHECK (segment_id IS NOT NULL OR id = '00000000-0000-0000-0000-000000000001');

ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_segment_required;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_segment_required
  CHECK (tipo_cliente <> 'conta_gerenciada' OR segment_id IS NOT NULL);

-- 3) Ajuste da regra de cliente: segmento obrigatório para TODO tipo, exceto consumidor_pf (decisão 2b).
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS clientes_segment_required;
ALTER TABLE public.clientes ADD CONSTRAINT clientes_segment_required
  CHECK (tipo_cliente = 'consumidor_pf' OR segment_id IS NOT NULL);

-- ===== migration-2026-11-07-tenant-public-domain.sql =====
-- Domínio do site público de cada empresa (2026-11-07).
-- As rotas públicas (/api/public/corretor/*) descobrem a empresa pelo domínio da requisição.
-- Idempotente. Não preenche valores: cada empresa cadastra o próprio domínio no Master.

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS public_domain VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS tenants_public_domain_key
  ON public.tenants (public_domain)
  WHERE public_domain IS NOT NULL;

-- ===== migration-2026-11-07-warn-cpl-factor.sql =====
-- Fator de alerta de CPL (decisão aprovada: 1,15). CPL > cpl_ideal × warn_cpl_factor = warn.
INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
SELECT s.id, 'warn_cpl_factor', 'Fator de alerta de CPL', 1.15::numeric, 'ratio',
       'CPL acima de ideal × este fator dispara alerta (warn). Abaixo do crítico. Aprovado em 2026-11-07.'
FROM public.system_segments s
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_benchmarks b
  WHERE b.segment_id = s.id AND b.metric_key = 'warn_cpl_factor' AND b.network_id IS NULL
);

-- ===== migration-2026-11-08-audit-score-thresholds.sql =====
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

-- ===== migration-2026-11-08-audit-scoring-bands.sql =====
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

-- ===== migration-2026-11-08-audit-scoring-bands-thresholds.sql =====
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

-- ===== migration-2026-11-09-audit-texts.sql =====
-- Textos e limites da auditoria por segmento.
-- Substitui números embutidos em auditReportService.ts (estimativas, limites de exibição,
-- faixas de LLA e de campanhas por cliente). Cada linha é um parâmetro de um segmento.
-- Estimativas usam min/max; limites de exibição usam só value_min.
-- Idempotente: cria a tabela se não existir e semeia os valores padrão para segmentos ativos
-- que ainda não os têm (ON CONFLICT DO NOTHING).

CREATE TABLE IF NOT EXISTS campanhasmarketingdigital.audit_text_settings (
  segment_id  UUID NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  param_key   VARCHAR(60) NOT NULL,
  value_min   NUMERIC(12,4) NOT NULL,
  value_max   NUMERIC(12,4),
  updated_at  TIMESTAMP NOT NULL DEFAULT now(),
  PRIMARY KEY (segment_id, param_key)
);

-- Valores padrão atuais (os mesmos que estavam fixos no código).
-- lead_gain_factor       : fração do CTR usada na estimativa de leads adicionais (0.8)
-- cpl_reduction          : redução estimada de CPL ao ativar MOF, em % (15–30)
-- tracking_gain          : eficiência estimada com tracking limpo, em % (10–20)
-- scale_gain             : escala estimada de leads com LLA, em % (40–80)
-- lla_range              : faixa de LLA sugerida, em % (1–3)
-- problem_dimensions     : quantas dimensões piores são avaliadas para problemas (5)
-- max_problems           : máximo de problemas exibidos (3)
-- max_opportunities      : máximo de oportunidades exibidas (3)
-- client_campaigns_top   : campanhas exibidas por cliente no ranking (2)
-- tenant_campaigns_top   : campanhas exibidas na empresa principal (3)
INSERT INTO campanhasmarketingdigital.audit_text_settings (segment_id, param_key, value_min, value_max)
SELECT s.id, p.param_key, p.value_min, p.value_max
FROM public.system_segments s
CROSS JOIN (VALUES
  ('lead_gain_factor',     0.8,  NULL::numeric),
  ('cpl_reduction',       15,    30),
  ('tracking_gain',       10,    20),
  ('scale_gain',          40,    80),
  ('lla_range',            1,     3),
  ('problem_dimensions',   5,  NULL::numeric),
  ('max_problems',         3,  NULL::numeric),
  ('max_opportunities',    3,  NULL::numeric),
  ('client_campaigns_top', 2,  NULL::numeric),
  ('tenant_campaigns_top', 3,  NULL::numeric)
) AS p(param_key, value_min, value_max)
WHERE s.is_active = true
ON CONFLICT (segment_id, param_key) DO NOTHING;

-- ===== migration-2026-11-10-insight-meta-whatsapp-signals.sql =====
-- Sinais de WhatsApp reportados pela Meta, gravados por dia/campanha no Insight.
-- Motivo: campanhas importadas (ou com CTA de WhatsApp direto) não passam pelo nosso rastreio,
-- então leads/CPL internos ficam zerados. Estes números vêm da própria Meta:
--   meta_link_clicks              = action_type 'link_click' (cliques no anúncio, incl. botão WhatsApp)
--   meta_conversations_started    = action_type 'onsite_conversion.messaging_conversation_started_7d'
-- Aditiva e idempotente: colunas novas com default 0, nada existente é alterado.

ALTER TABLE campanhasmarketingdigital."Insight"
  ADD COLUMN IF NOT EXISTS meta_link_clicks INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_conversations_started INTEGER NOT NULL DEFAULT 0;

-- ===== migration-2026-11-10-unify-warn-threshold-40.sql =====
-- Unifica o corte de "atenção" (status_warn_min) em 40 em todas as dimensões da auditoria.
-- Antes: 45 em creative, funnel_health, performance e tracking; 40 em spend_efficiency.
UPDATE campanhasmarketingdigital.audit_scoring_bands
SET score = 40, updated_at = now()
WHERE rule_key = 'status_warn_min' AND score <> 40;

-- ===== migration-2026-11-11-ad-insights.sql =====
-- Métricas por ANÚNCIO e por dia (feedback real da Meta sobre cada criativo).
-- Tabela separada de "Insight" de propósito: "Insight" é agregado por campanha e é somado
-- pelos dashboards; gravar linhas por anúncio ali duplicaria os totais.
-- Aditiva e idempotente.
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."AdInsight" (
  id                      TEXT PRIMARY KEY,
  "adId"                  TEXT NOT NULL REFERENCES campanhasmarketingdigital."Ad"(id) ON DELETE CASCADE,
  "campaignId"            TEXT NOT NULL,
  "tenantId"              UUID,
  date                    DATE NOT NULL,
  impressions             INTEGER NOT NULL DEFAULT 0,
  reach                   INTEGER NOT NULL DEFAULT 0,
  clicks                  INTEGER NOT NULL DEFAULT 0,
  spend                   DOUBLE PRECISION NOT NULL DEFAULT 0,
  frequency               DOUBLE PRECISION NOT NULL DEFAULT 0,
  "messagingConversations" INTEGER NOT NULL DEFAULT 0,
  "qualityRanking"        TEXT,
  "engagementRateRanking" TEXT,
  "conversionRateRanking" TEXT,
  "videoViews3s"          INTEGER NOT NULL DEFAULT 0,
  "videoViewsP25"         INTEGER NOT NULL DEFAULT 0,
  "videoViewsP50"         INTEGER NOT NULL DEFAULT 0,
  "videoViewsP75"         INTEGER NOT NULL DEFAULT 0,
  "videoViewsP100"        INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "AdInsight_adId_date_key" UNIQUE ("adId", date)
);
CREATE INDEX IF NOT EXISTS "AdInsight_campaignId_date_idx" ON campanhasmarketingdigital."AdInsight" ("campaignId", date);

-- ===== mensageria.contact_profiles / public.lead_timeline / tenants (10/11) =====
-- 1) mensageria.contact_profiles: nome e foto do WhatsApp por número.
--    Se existir a antiga agenda_contacts com dados, copia antes de descartar.
CREATE TABLE IF NOT EXISTS mensageria.contact_profiles (
  tenant_id  UUID NOT NULL,
  phone      TEXT NOT NULL,
  name       TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, phone)
);
DO $$
BEGIN
  IF to_regclass('mensageria.agenda_contacts') IS NOT NULL THEN
    INSERT INTO mensageria.contact_profiles (tenant_id, phone, name, updated_at)
      SELECT tenant_id, phone, name, updated_at FROM mensageria.agenda_contacts
    ON CONFLICT (tenant_id, phone) DO NOTHING;
    DROP TABLE mensageria.agenda_contacts;
  END IF;
END $$;

-- 2) public.lead_timeline: referências do histórico do lead (sem conteúdo duplicado).
CREATE TABLE IF NOT EXISTS public.lead_timeline (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  lead_uuid    UUID NOT NULL,
  tipo_origem  VARCHAR(30) NOT NULL,
  origem_id    TEXT NOT NULL,
  occurred_at  TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lead_timeline_tipo_origem_valores
    CHECK (tipo_origem IN ('mensageria_message', 'atividade')),
  CONSTRAINT lead_timeline_unica_referencia
    UNIQUE (tipo_origem, origem_id)
);
CREATE INDEX IF NOT EXISTS idx_lead_timeline_lead
  ON public.lead_timeline (tenant_id, lead_uuid, occurred_at DESC);

-- 3) public.tenants: tipo de atividade que representa mensagens no histórico (opcional).
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS tipo_atividade_mensagem_id INTEGER
    REFERENCES public.tipos_atividade(id) ON DELETE SET NULL;


-- ===== migration-2026-11-12-ad-thumbnails.sql =====
-- Miniaturas dos criativos (lista) separadas das imagens originais (modal).
-- Aditiva e idempotente: nenhum dado existente é alterado.
ALTER TABLE campanhasmarketingdigital."Ad"
  ADD COLUMN IF NOT EXISTS thumbnails TEXT[] NOT NULL DEFAULT '{}';

-- ===== migration-2026-11-13-leads-dono-user.sql =====
-- Dono do lead (primeiro usuário que atua nele). Idempotente; backfill só nos leads com
-- atividade humana já registrada.
ALTER TABLE public.leads_staging
  ADD COLUMN IF NOT EXISTS dono_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_staging_dono_user
  ON public.leads_staging (dono_user_id)
  WHERE dono_user_id IS NOT NULL;

UPDATE public.leads_staging l
   SET dono_user_id = sub.usuario_id
  FROM (
    SELECT DISTINCT ON (lead_uuid) lead_uuid, usuario_id
      FROM public.atividades_lead
     WHERE origem = 'humano' AND usuario_id IS NOT NULL AND deleted_at IS NULL
     ORDER BY lead_uuid, created_at ASC
  ) sub
 WHERE l.lead_uuid = sub.lead_uuid
   AND l.dono_user_id IS NULL;

COMMIT;

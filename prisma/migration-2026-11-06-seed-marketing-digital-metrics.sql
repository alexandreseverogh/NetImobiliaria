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

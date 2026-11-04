-- Catálogo de Métricas Dinâmico — Fase 2 (captura).
-- Guarda, por linha de Insight (1 por dia por campanha), o bag {metricKey: valor} resolvido a
-- partir das métricas curadas pelo Master em segment_metric_catalog pro segmento daquela
-- campanha. Nunca substitui as colunas fixas já existentes — é aditivo, e fica vazio ('{}')
-- pra todo Insight sincronizado antes desta migração ou de campanha sem nenhuma métrica extra
-- configurada no segmento.

ALTER TABLE campanhasmarketingdigital."Insight"
  ADD COLUMN IF NOT EXISTS custom_metrics JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN campanhasmarketingdigital."Insight".custom_metrics IS
  'Catálogo de Métricas Dinâmico — bag {metricKey: valor} resolvido via segment_metric_catalog do segmento da campanha (ver segmentMetricCatalogService.buildCustomMetrics). Nunca inclui chave sem dado real.';

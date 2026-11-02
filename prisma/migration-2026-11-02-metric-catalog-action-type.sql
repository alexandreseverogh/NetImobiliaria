-- Fase 1 (correção pré-Fase 2): alguns campos reais da Meta Insights API (actions,
-- action_values, cost_per_action_type) são ARRAYS genéricos — extrair UMA métrica específica
-- deles (ex.: "leads" dentro de actions) exige filtrar por action_type. Sem isso, meta_field
-- sozinho não basta pra resolver o valor de verdade quando aponta pra um desses 3 campos.

ALTER TABLE campanhasmarketingdigital.segment_metric_catalog
  ADD COLUMN IF NOT EXISTS action_type VARCHAR(100);

COMMENT ON COLUMN campanhasmarketingdigital.segment_metric_catalog.action_type IS
  'Só relevante quando meta_field é actions/action_values/cost_per_action_type — filtra o '
  'array pelo action_type real da Meta (ex.: onsite_conversion.lead_grouped, link_click). '
  'NULL quando meta_field já é um campo simples/plano.';

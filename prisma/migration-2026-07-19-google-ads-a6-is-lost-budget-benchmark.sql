-- FASE 1 (Google Ads) A6 — benchmark para a regra IMPRESSION_SHARE_OPPORTUNITY
-- (IS Lost Budget alto + CPL < ideal → SCALE). Mesmo padrão já usado por hook_rate_*
-- (migration-2026-05-31-fase5-video-metrics.sql) — 4 camadas via benchmarkResolver.ts.
-- Ver docs/PLANO_GOOGLE_TIKTOK.md A6.

INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
VALUES
  ('92e5ddd3-4f3b-4f93-9839-6168d09e25e8','is_lost_budget_scale_min','IS Lost Budget p/ Escalar (%)', 20, '%','IS perdido por orçamento acima disso + CPL bom → oportunidade real de aumentar verba'),
  ('e842312b-da48-403f-afdf-5058e2435a8c','is_lost_budget_scale_min','IS Lost Budget p/ Escalar (%)', 20, '%','IS perdido por orçamento acima disso + CPL bom → oportunidade real de aumentar verba'),
  ('9389eaf1-ec65-46e8-93fb-ba40c849c175','is_lost_budget_scale_min','IS Lost Budget p/ Escalar (%)', 20, '%','IS perdido por orçamento acima disso + CPL bom → oportunidade real de aumentar verba'),
  ('4690b2f8-0413-4c17-bcdb-9e62f7fea6a0','is_lost_budget_scale_min','IS Lost Budget p/ Escalar (%)', 20, '%','IS perdido por orçamento acima disso + CPL bom → oportunidade real de aumentar verba'),
  ('2b940dfd-9b9e-4e9e-ac7f-c4655f2aac42','is_lost_budget_scale_min','IS Lost Budget p/ Escalar (%)', 20, '%','Fallback master')
ON CONFLICT DO NOTHING;

-- FASE 5 — Video Metrics + Hook Rate
-- Executar via script ou psql (NUNCA prisma db push)

-- 1. Adiciona 7 colunas de vídeo em Insight
ALTER TABLE campanhasmarketingdigital."Insight"
  ADD COLUMN IF NOT EXISTS video_views_3s      INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_15s     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_25_pct  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_50_pct  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_75_pct  INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS video_views_100_pct INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS thruplay_views      INTEGER NOT NULL DEFAULT 0;

-- Índice parcial: só campanhas com vídeo real
CREATE INDEX IF NOT EXISTS idx_insight_video
  ON campanhasmarketingdigital."Insight"("campaignId", video_views_3s)
  WHERE video_views_3s > 0;

-- 2. Seeds hook_rate nos system_benchmarks (todos os segmentos)
--    hook_rate = video_views_3s / impressions * 100
INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
VALUES
  -- Imobiliário
  ('92e5ddd3-4f3b-4f93-9839-6168d09e25e8','hook_rate_critical','Hook Rate Crítico (%)', 8, '%','Abaixo disso o hook não retém atenção — pausar vídeo'),
  ('92e5ddd3-4f3b-4f93-9839-6168d09e25e8','hook_rate_min',     'Hook Rate Mínimo (%)', 12, '%','Hook fraco, revisar abertura do vídeo'),
  ('92e5ddd3-4f3b-4f93-9839-6168d09e25e8','hook_rate_good',    'Hook Rate Bom (%)',    25, '%','Hook acima da média do segmento'),
  -- Carros
  ('e842312b-da48-403f-afdf-5058e2435a8c','hook_rate_critical','Hook Rate Crítico (%)', 9, '%','Abaixo disso o hook não retém atenção'),
  ('e842312b-da48-403f-afdf-5058e2435a8c','hook_rate_min',     'Hook Rate Mínimo (%)', 14, '%','Hook fraco'),
  ('e842312b-da48-403f-afdf-5058e2435a8c','hook_rate_good',    'Hook Rate Bom (%)',    28, '%','Hook acima da média'),
  -- Saúde
  ('9389eaf1-ec65-46e8-93fb-ba40c849c175','hook_rate_critical','Hook Rate Crítico (%)',10, '%','Abaixo disso o hook não retém atenção'),
  ('9389eaf1-ec65-46e8-93fb-ba40c849c175','hook_rate_min',     'Hook Rate Mínimo (%)', 15, '%','Hook fraco'),
  ('9389eaf1-ec65-46e8-93fb-ba40c849c175','hook_rate_good',    'Hook Rate Bom (%)',    28, '%','Hook acima da média'),
  -- Geral
  ('4690b2f8-0413-4c17-bcdb-9e62f7fea6a0','hook_rate_critical','Hook Rate Crítico (%)', 8, '%','Abaixo disso o hook não retém atenção'),
  ('4690b2f8-0413-4c17-bcdb-9e62f7fea6a0','hook_rate_min',     'Hook Rate Mínimo (%)', 12, '%','Hook fraco'),
  ('4690b2f8-0413-4c17-bcdb-9e62f7fea6a0','hook_rate_good',    'Hook Rate Bom (%)',    22, '%','Hook acima da média'),
  -- Master
  ('2b940dfd-9b9e-4e9e-ac7f-c4655f2aac42','hook_rate_critical','Hook Rate Crítico (%)', 8, '%','Fallback master'),
  ('2b940dfd-9b9e-4e9e-ac7f-c4655f2aac42','hook_rate_min',     'Hook Rate Mínimo (%)', 12, '%','Fallback master'),
  ('2b940dfd-9b9e-4e9e-ac7f-c4655f2aac42','hook_rate_good',    'Hook Rate Bom (%)',    22, '%','Fallback master')
ON CONFLICT DO NOTHING;

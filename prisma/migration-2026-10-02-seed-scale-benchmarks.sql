-- Semeia os 4 benchmarks de ESCALA em todo segmento que ainda não os tem.
-- Origem: avisos "BENCHMARK NÃO CONFIGURADO" no log da produção (2026-10-02) — só os segmentos
-- imobiliaria e marketing-digital tinham essas linhas; os demais caíam no fallback silencioso.
-- Valores = SEGMENT_SEED_DEFAULTS de src/lib/intelligence/benchmarkResolver.ts (os mesmos que
-- um segmento novo recebe ao ser criado). DO NOTHING: nunca sobrescreve valor já curado.
-- Idempotente. Inclui o segmento master: o tenant Master também entra no ciclo do agente.
-- Aplicar: docker exec -i net-imobiliaria-prod_db-1 psql -U postgres -d net_imobiliaria < arquivo.sql

INSERT INTO public.system_benchmarks (id, segment_id, metric_key, metric_label, value, unit, description, created_at, updated_at, network_id)
SELECT gen_random_uuid(), s.id, d.metric_key, d.metric_label, d.value, d.unit, d.description, now(), now(), NULL
FROM public.system_segments s
CROSS JOIN (VALUES
  ('scale_budget_base_pct', 'Escala Base (%)',            10.0, 'PCT', '% mínimo ao escalar — campanha acabou de passar no threshold'),
  ('scale_budget_max_pct',  'Escala Máxima (%)',          25.0, 'PCT', 'Teto de % ao escalar — manter ≤25% para não resetar aprendizado'),
  ('scale_ratio_cap',       'CTR Cap (×threshold)',        3.0, 'NUM', 'Multiplicador de CTR que atinge a escala máxima'),
  ('avg_fit_scale_min',     'Fit Médio Mín. p/ Escalar',  40.0, 'NUM', 'Média de score_fit (0-100) dos leads da campanha no período — abaixo disso, SCALE não dispara mesmo com CTR/volume bons')
) AS d(metric_key, metric_label, value, unit, description)
ON CONFLICT (segment_id, metric_key, COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;

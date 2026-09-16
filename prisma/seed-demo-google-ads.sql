-- FASE 1 (Google Ads) — Dados de teste PERSISTENTES para o usuário testar a UI minuciosamente.
-- Diferente das rodadas anteriores de verificação, estes dados NÃO devem ser removidos.
-- Tenant: Marketing Digital (efbf62cf-9e28-4b31-a4f6-82a037412353) — tenant de desenvolvimento.

-- 1. Campanha Google (Performance Max / Search)
INSERT INTO campanhasmarketingdigital."Campaign"
  (id, tenant_id, name, objective, status, network_id, external_id, "createdAt", "updatedAt")
VALUES
  ('google-test-imoveis-sp-001', 'efbf62cf-9e28-4b31-a4f6-82a037412353',
   'Google Search — Apartamentos SP (dados de teste)', 'LEADS', 'ACTIVE',
   '2fe8a639-b674-446e-bfe7-a2b8fbfb40cf', '18293746501', now() - interval '14 days', now())
ON CONFLICT (id) DO NOTHING;

-- 2. AdSet (orçamento diário R$150 — em centavos)
INSERT INTO campanhasmarketingdigital."AdSet"
  (id, "campaignId", name, "dailyBudget", "startTime", "optimizationGoal", "billingEvent",
   "ageMin", "ageMax", genders, locations, "scheduleDays", "createdAt")
VALUES
  ('google-test-imoveis-sp-001-adset', 'google-test-imoveis-sp-001',
   'Google Search — Apartamentos SP · AdSet', 15000, now() - interval '14 days',
   'MAXIMIZE_CONVERSIONS', 'IMPRESSIONS', 25, 55, ARRAY[0,1],
   '{"key":"BR:SP","name":"São Paulo"}'::jsonb, ARRAY[0,1,2,3,4,5,6], now())
ON CONFLICT (id) DO NOTHING;

-- 3. Insight — 14 dias com variação realista (spend/conversions_value em centavos)
--    search_impression_share 55-75% · search_budget_lost_is 15-35% (oportunidade real de
--    escalar, testa a regra IMPRESSION_SHARE_OPPORTUNITY) · ROAS resultante ~2.8-3.5x
INSERT INTO campanhasmarketingdigital."Insight"
  (id, tenant_id, "campaignId", date, impressions, reach, clicks, spend, conversions,
   search_impression_share, search_budget_lost_is, search_rank_lost_is, conversions_value, "createdAt")
SELECT
  'google-test-imoveis-sp-001-' || to_char(d, 'YYYY-MM-DD'),
  'efbf62cf-9e28-4b31-a4f6-82a037412353'::uuid,
  'google-test-imoveis-sp-001',
  d::date,
  imp,
  imp,
  clk,
  spend,
  conv,
  round((55 + random()*20)::numeric, 1),
  round((15 + random()*20)::numeric, 1),
  round((random()*5)::numeric, 1),
  round((conv * (9000 + random()*4000))::numeric, 2),
  now()
FROM (
  SELECT
    gs AS d,
    (3500 + (random()*2500))::int AS imp,
    (150 + (random()*100))::int AS clk,
    (12000 + random()*6000)::float AS spend,
    (2 + (random()*5))::int AS conv
  FROM generate_series(current_date - interval '13 days', current_date, interval '1 day') AS gs
) t
ON CONFLICT (id) DO NOTHING;

-- 4. Leads reais (drivam o KPI "Leads" do dashboard, tabela separada de Insight.conversions)
INSERT INTO campanhasmarketingdigital."Lead"
  (id, "campaignId", "phoneClicked", "sourceUrl", "clickedAt", tenant_id)
SELECT
  'google-test-lead-' || gs || '-' || (row_number() over ()),
  'google-test-imoveis-sp-001',
  '+55119' || lpad((random()*99999999)::int::text, 8, '0'),
  'https://exemplo.com/imoveis/apartamento-sp',
  current_date - (gs || ' days')::interval + (random() * interval '20 hours'),
  'efbf62cf-9e28-4b31-a4f6-82a037412353'::uuid
FROM generate_series(0, 13) AS gs
CROSS JOIN generate_series(1, 3) AS n  -- ~3 leads/dia, 14 dias = ~42 leads
ON CONFLICT (id) DO NOTHING;

-- 5. Search Terms — mistura de termos com e sem conversão (testa o drill-down + negativação)
INSERT INTO campanhasmarketingdigital."GoogleSearchTerm"
  (tenant_id, campaign_id, search_term, match_type, date, impressions, clicks, cost, conversions, status)
VALUES
  ('efbf62cf-9e28-4b31-a4f6-82a037412353', 'google-test-imoveis-sp-001', 'apartamento 2 quartos sp', 'PHRASE', current_date - 1, 1400, 95, 5800, 4, 'none'),
  ('efbf62cf-9e28-4b31-a4f6-82a037412353', 'google-test-imoveis-sp-001', 'apartamento a venda zona sul', 'PHRASE', current_date - 1, 980, 70, 4200, 3, 'none'),
  ('efbf62cf-9e28-4b31-a4f6-82a037412353', 'google-test-imoveis-sp-001', 'imoveis de luxo sp', 'PHRASE', current_date - 2, 620, 40, 2600, 2, 'none'),
  ('efbf62cf-9e28-4b31-a4f6-82a037412353', 'google-test-imoveis-sp-001', 'curso corretor de imoveis gratis', 'BROAD', current_date - 1, 850, 60, 3900, 0, 'none'),
  ('efbf62cf-9e28-4b31-a4f6-82a037412353', 'google-test-imoveis-sp-001', 'aluguel de apartamento sp', 'BROAD', current_date - 2, 1100, 55, 3200, 0, 'none'),
  ('efbf62cf-9e28-4b31-a4f6-82a037412353', 'google-test-imoveis-sp-001', 'como ser corretor de imoveis', 'BROAD', current_date - 3, 500, 30, 1800, 0, 'none')
ON CONFLICT (tenant_id, campaign_id, search_term, date) DO NOTHING;

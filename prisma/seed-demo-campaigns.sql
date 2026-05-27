-- =============================================================================
-- SEED: Dados de demonstração para testes de UI/UX
-- Tenant: efbf62cf-9e28-4b31-a4f6-82a037412353 (imobiliaria-md)
-- Cria 5 campanhas com 45 dias de histórico, leads e insights variados
-- =============================================================================

DO $$
DECLARE
  v_tenant_id  UUID := 'efbf62cf-9e28-4b31-a4f6-82a037412353';

  -- IDs das campanhas
  c1 UUID := gen_random_uuid();  -- Alto Padrão Alphaville  → SCALE
  c2 UUID := gen_random_uuid();  -- Studio Centro SP        → PAUSE
  c3 UUID := gen_random_uuid();  -- Zona Sul Família        → ALERT frequência
  c4 UUID := gen_random_uuid();  -- Smart Tower Lançamento  → OPTIMIZE CPL
  c5 UUID := gen_random_uuid();  -- Reserva Verde (nova)    → ALERT CPC trend

  -- IDs dos AdSets (1 por campanha)
  as1 UUID := gen_random_uuid();
  as2 UUID := gen_random_uuid();
  as3 UUID := gen_random_uuid();
  as4 UUID := gen_random_uuid();
  as5 UUID := gen_random_uuid();

  -- IDs dos Ads
  ad1 UUID := gen_random_uuid();
  ad2 UUID := gen_random_uuid();
  ad3 UUID := gen_random_uuid();
  ad4 UUID := gen_random_uuid();
  ad5 UUID := gen_random_uuid();

  -- Iteradores
  d         INTEGER;
  dt        DATE;
  v_impr    INTEGER;
  v_reach   INTEGER;
  v_clicks  INTEGER;
  v_spend   FLOAT;
  v_freq    FLOAT;
  v_cpc     FLOAT;
  v_cpm     FLOAT;
  v_ctr     FLOAT;
  v_leads   INTEGER;
  v_lead_i  INTEGER;

BEGIN

-- ─── Limpa dados anteriores de demonstração ──────────────────────────────────
DELETE FROM campanhasmarketingdigital."Lead"
  WHERE tenant_id = v_tenant_id;

DELETE FROM campanhasmarketingdigital."AiInsight"
  WHERE tenant_id = v_tenant_id;

DELETE FROM campanhasmarketingdigital."AgentAction"
  WHERE tenant_id = v_tenant_id;

DELETE FROM campanhasmarketingdigital."Insight"
  WHERE tenant_id = v_tenant_id;

DELETE FROM campanhasmarketingdigital."Ad"
  WHERE "adSetId" IN (
    SELECT a."id" FROM campanhasmarketingdigital."AdSet" a
    JOIN campanhasmarketingdigital."Campaign" c ON c.id = a."campaignId"
    WHERE c.tenant_id = v_tenant_id
  );

DELETE FROM campanhasmarketingdigital."AdSet"
  WHERE "campaignId" IN (
    SELECT id FROM campanhasmarketingdigital."Campaign"
    WHERE tenant_id = v_tenant_id
  );

DELETE FROM campanhasmarketingdigital."Campaign"
  WHERE tenant_id = v_tenant_id;

-- ─── Campanhas ────────────────────────────────────────────────────────────────
INSERT INTO campanhasmarketingdigital."Campaign"
  (id, tenant_id, client_id, "metaCampaignId", name, objective, status, "specialAdCategory", "createdAt", "updatedAt")
VALUES
  (c1, v_tenant_id, NULL, 'meta_demo_001', 'Alto Padrão — Alphaville',       'OUTCOME_LEADS',   'ACTIVE',  NULL, NOW()-INTERVAL '45 days', NOW()),
  (c2, v_tenant_id, NULL, 'meta_demo_002', 'Studio Centro SP',                'OUTCOME_TRAFFIC', 'ACTIVE',  NULL, NOW()-INTERVAL '45 days', NOW()),
  (c3, v_tenant_id, NULL, 'meta_demo_003', 'Zona Sul — Família',              'OUTCOME_LEADS',   'ACTIVE',  NULL, NOW()-INTERVAL '45 days', NOW()),
  (c4, v_tenant_id, NULL, 'meta_demo_004', 'Smart Tower Lançamento',          'OUTCOME_LEADS',   'ACTIVE',  NULL, NOW()-INTERVAL '45 days', NOW()),
  (c5, v_tenant_id, NULL, 'meta_demo_005', 'Reserva Verde (nova)',            'OUTCOME_LEADS',   'ACTIVE',  NULL, NOW()-INTERVAL '8 days',  NOW());

-- ─── AdSets ───────────────────────────────────────────────────────────────────
INSERT INTO campanhasmarketingdigital."AdSet"
  (id, "metaAdSetId", "campaignId", name, "dailyBudget", "startTime", "optimizationGoal",
   "billingEvent", "ageMin", "ageMax", genders, locations, interests, "scheduleDays", "createdAt")
VALUES
  (as1, 'meta_as_001', c1, 'Alphaville 35-60 anos',     15000, NOW()-INTERVAL '45 days', 'LEAD_GENERATION',  'IMPRESSIONS', 35, 60, '{0}', '{"key":"BR:SP:Barueri","name":"Barueri"}', '[]', '{1,2,3,4,5}',   NOW()-INTERVAL '45 days'),
  (as2, 'meta_as_002', c2, 'Centro SP 25-40 anos',       8000, NOW()-INTERVAL '45 days', 'LINK_CLICKS',      'IMPRESSIONS', 25, 40, '{0}', '{"key":"BR:SP:São Paulo","name":"SP"}',   '[]', '{1,2,3,4,5,6}', NOW()-INTERVAL '45 days'),
  (as3, 'meta_as_003', c3, 'Zona Sul Família 30-50',    12000, NOW()-INTERVAL '45 days', 'LEAD_GENERATION',  'IMPRESSIONS', 30, 50, '{0}', '{"key":"BR:SP","name":"São Paulo"}',      '[]', '{1,2,3,4,5,6,7}',NOW()-INTERVAL '45 days'),
  (as4, 'meta_as_004', c4, 'Lançamento Smart Tower',    18000, NOW()-INTERVAL '45 days', 'LEAD_GENERATION',  'IMPRESSIONS', 28, 55, '{0}', '{"key":"BR:SP","name":"São Paulo"}',      '[]', '{1,2,3,4,5}',   NOW()-INTERVAL '45 days'),
  (as5, 'meta_as_005', c5, 'Reserva Verde Interesse',    9000, NOW()-INTERVAL '8 days',  'LEAD_GENERATION',  'IMPRESSIONS', 30, 55, '{0}', '{"key":"BR:SP:Cotia","name":"Cotia SP"}', '[]', '{1,2,3,4,5}',   NOW()-INTERVAL '8 days');

-- ─── Ads ──────────────────────────────────────────────────────────────────────
INSERT INTO campanhasmarketingdigital."Ad"
  (id, "metaAdId", "adSetId", name, status, "creativeType", images, body, headline, "linkUrl", "ctaType", "trackingId", "createdAt")
VALUES
  (ad1, 'meta_ad_001', as1, 'Alto Padrão — Principal',  'ACTIVE', 'IMAGE', '{}', 'Condomínio de alto padrão em Alphaville. Lazer completo, segurança 24h. Fale com um especialista.',           'Alphaville — Alto Padrão', NULL, 'WHATSAPP_MESSAGE', 'demo-track-001', NOW()-INTERVAL '45 days'),
  (ad2, 'meta_ad_002', as2, 'Studio Centro — Principal','ACTIVE', 'IMAGE', '{}', 'Studio moderno no coração de SP. Ideal para investimento. Facilidade de financiamento.',                      'Studio Centro SP',         NULL, 'WHATSAPP_MESSAGE', 'demo-track-002', NOW()-INTERVAL '45 days'),
  (ad3, 'meta_ad_003', as3, 'Zona Sul Família — Imagem','ACTIVE', 'IMAGE', '{}', 'Casa espaçosa na Zona Sul com quintal. Perfeita para sua família crescer com segurança e conforto.',        'Casas — Zona Sul SP',      NULL, 'WHATSAPP_MESSAGE', 'demo-track-003', NOW()-INTERVAL '45 days'),
  (ad4, 'meta_ad_004', as4, 'Smart Tower — Lançamento', 'ACTIVE', 'IMAGE', '{}', 'Pré-lançamento exclusivo Smart Tower. Localização privilegiada, plantas inteligentes. Reserve já!',          'Smart Tower — Lançamento', NULL, 'WHATSAPP_MESSAGE', 'demo-track-004', NOW()-INTERVAL '45 days'),
  (ad5, 'meta_ad_005', as5, 'Reserva Verde — Nova',     'ACTIVE', 'IMAGE', '{}', 'Lançamento Reserva Verde em Cotia. Natureza e qualidade de vida a 25min de SP. Últimas unidades.',          'Reserva Verde — Cotia SP', NULL, 'WHATSAPP_MESSAGE', 'demo-track-005', NOW()-INTERVAL '8 days');

-- =============================================================================
-- INSIGHTS: Campanha 1 — Alto Padrão Alphaville (SCALE)
-- CTR: 3.0-4.2% | CPC: R$0.85-1.10 | Frequência: 1.8-2.3 | Leads: 8-14/dia
-- =============================================================================
FOR d IN 1..44 LOOP
  dt       := (CURRENT_DATE - (44 - d) * INTERVAL '1 day')::DATE;
  v_impr   := 8000 + (d * 30) + (CASE WHEN d % 7 IN (0,6) THEN -1200 ELSE 0 END);
  v_reach  := ROUND(v_impr * 0.72);
  v_ctr    := 3.2 + SIN(d * 0.3) * 0.6 + (d * 0.015);
  v_clicks := ROUND(v_impr * v_ctr / 100);
  v_spend  := v_clicks * (0.90 + COS(d * 0.2) * 0.12);
  v_freq   := 1.85 + SIN(d * 0.15) * 0.25;
  v_cpc    := CASE WHEN v_clicks > 0 THEN v_spend / v_clicks ELSE 0 END;
  v_cpm    := CASE WHEN v_impr  > 0 THEN (v_spend / v_impr) * 1000 ELSE 0 END;

  INSERT INTO campanhasmarketingdigital."Insight"
    (id, tenant_id, "campaignId", "adSetId", date, impressions, reach, clicks,
     spend, cpc, cpm, ctr, conversions, frequency, "createdAt")
  VALUES (gen_random_uuid()::text, v_tenant_id, c1, as1, dt,
          v_impr, v_reach, v_clicks,
          ROUND(v_spend::NUMERIC, 2), ROUND(v_cpc::NUMERIC, 4),
          ROUND(v_cpm::NUMERIC, 4), ROUND(v_ctr::NUMERIC, 4),
          0, ROUND(v_freq::NUMERIC, 2), NOW());

  -- Leads: 9-14 por dia
  v_leads := 9 + (d % 5);
  FOR v_lead_i IN 1..v_leads LOOP
    INSERT INTO campanhasmarketingdigital."Lead"
      (id, tenant_id, client_id, "campaignId", "adId", "phoneClicked",
       "utmSource", "utmCampaign", "clickedAt")
    VALUES (gen_random_uuid()::text, v_tenant_id, NULL, c1, ad1, '5511999990001',
            'meta', 'alto-padrao-alphaville',
            dt + (v_lead_i * INTERVAL '1 hour 23 minutes'));
  END LOOP;
END LOOP;

-- =============================================================================
-- INSIGHTS: Campanha 2 — Studio Centro SP (PAUSE — CTR < 1%)
-- CTR: 0.45-0.75% | CPC: R$2.20-3.10 | Gasto alto, zero leads
-- =============================================================================
FOR d IN 1..44 LOOP
  dt       := (CURRENT_DATE - (44 - d) * INTERVAL '1 day')::DATE;
  v_impr   := 12000 + (d * 20) + (CASE WHEN d % 7 IN (0,6) THEN -2000 ELSE 0 END);
  v_reach  := ROUND(v_impr * 0.68);
  v_ctr    := 0.58 + SIN(d * 0.5) * 0.12;
  v_clicks := ROUND(v_impr * v_ctr / 100);
  v_spend  := v_clicks * (2.50 + SIN(d * 0.3) * 0.35);
  v_freq   := 2.40 + (d * 0.01);
  v_cpc    := CASE WHEN v_clicks > 0 THEN v_spend / v_clicks ELSE 0 END;
  v_cpm    := CASE WHEN v_impr  > 0 THEN (v_spend / v_impr) * 1000 ELSE 0 END;

  INSERT INTO campanhasmarketingdigital."Insight"
    (id, tenant_id, "campaignId", "adSetId", date, impressions, reach, clicks,
     spend, cpc, cpm, ctr, conversions, frequency, "createdAt")
  VALUES (gen_random_uuid()::text, v_tenant_id, c2, as2, dt,
          v_impr, v_reach, v_clicks,
          ROUND(v_spend::NUMERIC, 2), ROUND(v_cpc::NUMERIC, 4),
          ROUND(v_cpm::NUMERIC, 4), ROUND(v_ctr::NUMERIC, 4),
          0, ROUND(v_freq::NUMERIC, 2), NOW());
  -- Sem leads (gasto sem resultado = PAUSE)
END LOOP;

-- =============================================================================
-- INSIGHTS: Campanha 3 — Zona Sul Família (ALERT — frequência > 3)
-- Frequência: 3.8-5.2 | CTR caindo | CPC subindo
-- =============================================================================
FOR d IN 1..44 LOOP
  dt       := (CURRENT_DATE - (44 - d) * INTERVAL '1 day')::DATE;
  v_impr   := 9500 - (d * 25);  -- alcance caindo (fadiga)
  v_reach  := ROUND(v_impr * 0.55);
  v_freq   := 3.8 + (d * 0.03) + SIN(d * 0.4) * 0.3;  -- frequência crescente
  v_ctr    := GREATEST(0.8, 2.8 - (d * 0.04));         -- CTR caindo com fadiga
  v_clicks := ROUND(v_impr * v_ctr / 100);
  v_cpc    := 1.40 + (d * 0.025) + SIN(d * 0.3) * 0.15; -- CPC subindo
  v_spend  := v_clicks * v_cpc;
  v_cpm    := CASE WHEN v_impr  > 0 THEN (v_spend / v_impr) * 1000 ELSE 0 END;

  INSERT INTO campanhasmarketingdigital."Insight"
    (id, tenant_id, "campaignId", "adSetId", date, impressions, reach, clicks,
     spend, cpc, cpm, ctr, conversions, frequency, "createdAt")
  VALUES (gen_random_uuid()::text, v_tenant_id, c3, as3, dt,
          GREATEST(v_impr, 2000), v_reach, GREATEST(v_clicks, 10),
          ROUND(v_spend::NUMERIC, 2), ROUND(v_cpc::NUMERIC, 4),
          ROUND(v_cpm::NUMERIC, 4), ROUND(v_ctr::NUMERIC, 4),
          0, ROUND(v_freq::NUMERIC, 2), NOW());

  -- Leads existem mas caindo com a fadiga
  v_leads := GREATEST(1, 5 - (d / 10));
  FOR v_lead_i IN 1..v_leads LOOP
    INSERT INTO campanhasmarketingdigital."Lead"
      (id, tenant_id, client_id, "campaignId", "adId", "phoneClicked",
       "utmSource", "utmCampaign", "clickedAt")
    VALUES (gen_random_uuid()::text, v_tenant_id, NULL, c3, ad3, '5511999990003',
            'meta', 'zona-sul-familia',
            dt + (v_lead_i * INTERVAL '2 hours 11 minutes'));
  END LOOP;
END LOOP;

-- =============================================================================
-- INSIGHTS: Campanha 4 — Smart Tower Lançamento (OPTIMIZE — CPL > R$20)
-- CTR: 1.8-2.2% | CPC: R$1.40 | Leads existem mas CPL = R$35+
-- =============================================================================
FOR d IN 1..44 LOOP
  dt       := (CURRENT_DATE - (44 - d) * INTERVAL '1 day')::DATE;
  v_impr   := 7000 + (d * 40) + (CASE WHEN d % 7 IN (0,6) THEN -900 ELSE 0 END);
  v_reach  := ROUND(v_impr * 0.70);
  v_ctr    := 1.90 + SIN(d * 0.4) * 0.25;
  v_clicks := ROUND(v_impr * v_ctr / 100);
  v_cpc    := 1.35 + COS(d * 0.2) * 0.15;
  v_spend  := v_clicks * v_cpc;
  v_freq   := 2.10 + (d * 0.008);
  v_cpm    := CASE WHEN v_impr  > 0 THEN (v_spend / v_impr) * 1000 ELSE 0 END;

  INSERT INTO campanhasmarketingdigital."Insight"
    (id, tenant_id, "campaignId", "adSetId", date, impressions, reach, clicks,
     spend, cpc, cpm, ctr, conversions, frequency, "createdAt")
  VALUES (gen_random_uuid()::text, v_tenant_id, c4, as4, dt,
          v_impr, v_reach, v_clicks,
          ROUND(v_spend::NUMERIC, 2), ROUND(v_cpc::NUMERIC, 4),
          ROUND(v_cpm::NUMERIC, 4), ROUND(v_ctr::NUMERIC, 4),
          0, ROUND(v_freq::NUMERIC, 2), NOW());

  -- Poucos leads → CPL alto (~R$35)
  v_leads := 2 + (d % 3);
  FOR v_lead_i IN 1..v_leads LOOP
    INSERT INTO campanhasmarketingdigital."Lead"
      (id, tenant_id, client_id, "campaignId", "adId", "phoneClicked",
       "utmSource", "utmCampaign", "clickedAt")
    VALUES (gen_random_uuid()::text, v_tenant_id, NULL, c4, ad4, '5511999990004',
            'meta', 'smart-tower-lancamento',
            dt + (v_lead_i * INTERVAL '3 hours 7 minutes'));
  END LOOP;
END LOOP;

-- =============================================================================
-- INSIGHTS: Campanha 5 — Reserva Verde (nova — 7 dias, CPC subindo)
-- CTR: 2.1% | CPC subindo de R$1.10 para R$1.60 em 7 dias → ALERT CPC trend
-- =============================================================================
FOR d IN 1..7 LOOP
  dt       := (CURRENT_DATE - (7 - d) * INTERVAL '1 day')::DATE;
  v_impr   := 4500 + (d * 120);
  v_reach  := ROUND(v_impr * 0.74);
  v_ctr    := 2.10 + SIN(d * 0.8) * 0.30;
  v_clicks := ROUND(v_impr * v_ctr / 100);
  v_cpc    := 1.10 + (d * 0.075);  -- subindo claramente
  v_spend  := v_clicks * v_cpc;
  v_freq   := 1.20 + (d * 0.06);
  v_cpm    := CASE WHEN v_impr  > 0 THEN (v_spend / v_impr) * 1000 ELSE 0 END;

  INSERT INTO campanhasmarketingdigital."Insight"
    (id, tenant_id, "campaignId", "adSetId", date, impressions, reach, clicks,
     spend, cpc, cpm, ctr, conversions, frequency, "createdAt")
  VALUES (gen_random_uuid()::text, v_tenant_id, c5, as5, dt,
          v_impr, v_reach, v_clicks,
          ROUND(v_spend::NUMERIC, 2), ROUND(v_cpc::NUMERIC, 4),
          ROUND(v_cpm::NUMERIC, 4), ROUND(v_ctr::NUMERIC, 4),
          0, ROUND(v_freq::NUMERIC, 2), NOW());

  -- Leads razoáveis na campanha nova
  v_leads := 2 + (d % 4);
  FOR v_lead_i IN 1..v_leads LOOP
    INSERT INTO campanhasmarketingdigital."Lead"
      (id, tenant_id, client_id, "campaignId", "adId", "phoneClicked",
       "utmSource", "utmCampaign", "clickedAt")
    VALUES (gen_random_uuid()::text, v_tenant_id, NULL, c5, ad5, '5511999990005',
            'meta', 'reserva-verde',
            dt + (v_lead_i * INTERVAL '1 hour 44 minutes'));
  END LOOP;
END LOOP;

RAISE NOTICE '✅ Seed concluído com sucesso!';
RAISE NOTICE '   Campanhas criadas: 5';
RAISE NOTICE '   Dias de insights: ~209 registros';
RAISE NOTICE '   Leads inseridos: ~700+';

END $$;

-- Confirma resultados
SELECT
  c.name                                    AS campanha,
  c.status,
  COUNT(DISTINCT i.id)                      AS dias_insights,
  ROUND(SUM(i.spend)::NUMERIC, 2)           AS gasto_total,
  SUM(i.clicks)                             AS cliques_total,
  ROUND(AVG(i.ctr)::NUMERIC, 2)            AS ctr_medio,
  ROUND(AVG(i.frequency)::NUMERIC, 2)       AS freq_media,
  COUNT(DISTINCT l.id)                      AS total_leads,
  ROUND(
    CASE WHEN COUNT(DISTINCT l.id) > 0
    THEN SUM(i.spend) / COUNT(DISTINCT l.id)
    ELSE NULL END::NUMERIC, 2
  )                                          AS cpl_medio
FROM campanhasmarketingdigital."Campaign" c
LEFT JOIN campanhasmarketingdigital."Insight" i  ON i."campaignId" = c.id
LEFT JOIN campanhasmarketingdigital."Lead"    l  ON l."campaignId" = c.id
WHERE c.tenant_id = 'efbf62cf-9e28-4b31-a4f6-82a037412353'
GROUP BY c.name, c.status
ORDER BY gasto_total DESC NULLS LAST;

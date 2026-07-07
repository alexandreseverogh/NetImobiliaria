-- =============================================================================
-- SEED: Dataset multi-segmento para testes do Dashboard de Campanhas
-- Tenant: efbf62cf-9e28-4b31-a4f6-82a037412353 (Marketing Digital)
--
-- Objetivo: povoar todas as tabelas lidas por /admin/campanhas/dashboard
-- cobrindo 4 segmentos de negócio (Imobiliário, Saúde, Carros, Geral),
-- vários clientes por segmento e perfis de performance variados, sem nunca
-- misturar segmentos (isolamento via COALESCE(cliente.segment_id, tenant.segment_id)).
--
-- IDEMPOTENTE e ADITIVO: identifica seus próprios registros pelo prefixo
-- 'seed_ms_' em metaCampaignId. Re-executar apaga apenas o que ele criou —
-- nunca toca nos dados reais de Alexandre/Gisele ou no seed-demo antigo.
--
-- funnel_stage usa o padrão do sistema: TOF (topo) / MOF (meio) / BOF (fundo).
--
-- Aplicar:
--   docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria < prisma/seed-multisegmento-teste.sql
-- =============================================================================

-- ─── Clientes novos (idempotente por uuid fixo) ──────────────────────────────
-- segment_id: imobiliaria 92e5ddd3 · saude 9389eaf1 · carros e842312b · geral 4690b2f8
INSERT INTO public.clientes (uuid, nome, cpf, telefone, tenant_id, segment_id, website)
VALUES
  ('a5ed0001-0000-4000-8000-000000000001', 'Imobiliária Premium',      '11111111111', '(11) 99000-0001', 'efbf62cf-9e28-4b31-a4f6-82a037412353', '92e5ddd3-4f3b-4f93-9839-6168d09e25e8', 'https://imobiliariapremium.com.br'),
  ('a5ed0002-0000-4000-8000-000000000002', 'Clínica OdontoVida',       '22222222222', '(11) 99000-0002', 'efbf62cf-9e28-4b31-a4f6-82a037412353', '9389eaf1-ec65-46e8-93fb-ba40c849c175', 'https://odontovida.com.br'),
  ('a5ed0003-0000-4000-8000-000000000003', 'AutoMax Veículos',         '33333333333', '(11) 99000-0003', 'efbf62cf-9e28-4b31-a4f6-82a037412353', 'e842312b-da48-403f-afdf-5058e2435a8c', 'https://automax.com.br'),
  ('a5ed0004-0000-4000-8000-000000000004', 'RodaBoa Concessionária',   '44444444444', '(11) 99000-0004', 'efbf62cf-9e28-4b31-a4f6-82a037412353', 'e842312b-da48-403f-afdf-5058e2435a8c', 'https://rodaboa.com.br'),
  ('a5ed0005-0000-4000-8000-000000000005', 'Loja Mix Geral',           '55555555555', '(11) 99000-0005', 'efbf62cf-9e28-4b31-a4f6-82a037412353', '4690b2f8-0413-4c17-bcdb-9e62f7fea6a0', 'https://lojamix.com.br')
ON CONFLICT (uuid) DO UPDATE
  SET segment_id = EXCLUDED.segment_id, tenant_id = EXCLUDED.tenant_id, telefone = EXCLUDED.telefone;

-- Normaliza telefone para o formato canônico (XX) XXXXX-XXXX em qualquer linha
-- da tabela que ainda esteja em dígitos crus com DDI 55 embutido (ex: dados
-- legados deste seed antes da correção acima).
UPDATE public.clientes
SET telefone = '(' || substring(regexp_replace(telefone, '\D', '', 'g') FROM 3 FOR 2) || ') '
             || substring(regexp_replace(telefone, '\D', '', 'g') FROM 5 FOR 5) || '-'
             || substring(regexp_replace(telefone, '\D', '', 'g') FROM 10 FOR 4)
WHERE telefone ~ '^55\d{11}$';

-- =============================================================================
-- Campanhas + AdSets + Ads + Insights (44 dias) + Leads
-- =============================================================================
DO $$
DECLARE
  v_tenant_id  UUID := 'efbf62cf-9e28-4b31-a4f6-82a037412353';

  -- Clientes (existentes + novos)
  cli_alexandre UUID := '36878717-aa94-4b5d-992e-d328ec0d7f3e'; -- Imobiliário (existe)
  cli_gisele    UUID := '133b75b3-4eac-4296-9e95-c40d74e590fa'; -- Saúde (existe)
  cli_premium   UUID := 'a5ed0001-0000-4000-8000-000000000001';
  cli_odonto    UUID := 'a5ed0002-0000-4000-8000-000000000002';
  cli_automax   UUID := 'a5ed0003-0000-4000-8000-000000000003';
  cli_rodaboa   UUID := 'a5ed0004-0000-4000-8000-000000000004';
  cli_lojamix   UUID := 'a5ed0005-0000-4000-8000-000000000005';

  spec      RECORD;
  v_idx     INTEGER := 0;
  v_camp    TEXT;
  v_adset   TEXT;
  v_ad      TEXT;

  -- iteradores de insight
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
  v_conv    INTEGER;
  v_leads   INTEGER;
  v_lead_i  INTEGER;
  v_vv3     INTEGER;
BEGIN

-- ─── Limpa SOMENTE registros deste seed (prefixo seed_ms_) ───────────────────
DELETE FROM campanhasmarketingdigital."Lead"
  WHERE "campaignId" IN (SELECT id FROM campanhasmarketingdigital."Campaign" WHERE "metaCampaignId" LIKE 'seed_ms_%');
DELETE FROM campanhasmarketingdigital."Insight"
  WHERE "campaignId" IN (SELECT id FROM campanhasmarketingdigital."Campaign" WHERE "metaCampaignId" LIKE 'seed_ms_%');
DELETE FROM campanhasmarketingdigital."Ad"
  WHERE "adSetId" IN (
    SELECT a.id FROM campanhasmarketingdigital."AdSet" a
    JOIN campanhasmarketingdigital."Campaign" c ON c.id = a."campaignId"
    WHERE c."metaCampaignId" LIKE 'seed_ms_%');
DELETE FROM campanhasmarketingdigital."AdSet"
  WHERE "campaignId" IN (SELECT id FROM campanhasmarketingdigital."Campaign" WHERE "metaCampaignId" LIKE 'seed_ms_%');
DELETE FROM campanhasmarketingdigital."Campaign"
  WHERE "metaCampaignId" LIKE 'seed_ms_%';

-- ─── Itera as specs de campanha ──────────────────────────────────────────────
-- profile: scale | pause | alert | optimize  → controla curvas e disparo de insight
-- funnel:  TOF | MOF | BOF
FOR spec IN
  SELECT * FROM (VALUES
    -- client_id,      cname,                              objective,        status,   lifecycle,  funnel, angle,                       profile,    base_impr, base_ctr, base_cpc, base_freq, leads_base, budget, video, body_txt, headline_txt
    -- ===== IMOBILIÁRIO (ideal 35 / crítico 80) =====
    (cli_alexandre, 'Alexandre · Localização Premium',    'OUTCOME_LEADS',  'ACTIVE', 'SCALING',  'BOF', 'localizacao_premium',       'scale',     8000, 3.1, 0.92, 1.85,  9, 15000, true,  'Apartamentos em localização privilegiada. Agende sua visita.',      'Localização Premium'),
    (cli_alexandre, 'Alexandre · Últimas Unidades',       'OUTCOME_LEADS',  'ACTIVE', 'FATIGUED', 'MOF', 'urgencia_unidades',         'alert',     9000, 1.6, 1.45, 3.10,  5, 12000, false, 'Últimas unidades disponíveis. Não perca!',                          'Últimas Unidades'),
    (cli_premium,   'Premium · Financiamento Facilitado', 'OUTCOME_LEADS',  'ACTIVE', 'STABLE',   'BOF', 'financiamento_facilitado',  'scale',     7500, 2.9, 0.95, 1.80, 10, 16000, true,  'Financiamento facilitado, entrada mínima. Fale com um consultor.',  'Financiamento Facilitado'),
    (cli_premium,   'Premium · Valor da Parcela',         'OUTCOME_TRAFFIC','PAUSED', 'PAUSED',   'TOF', 'valor_mensalidade',         'pause',    11000, 0.58, 2.55, 2.40,  0, 10000, false, 'Parcelas que cabem no seu bolso. Simule agora.',                    'Parcela que Cabe no Bolso'),
    (cli_premium,   'Premium · Diferencial Construtora',  'OUTCOME_LEADS',  'ACTIVE', 'FATIGUED', 'MOF', 'diferencial_construtora',   'alert',     8800, 1.7, 1.40, 3.05,  5, 13000, false, 'Construtora premiada, entrega garantida. Conheça.',                 'Construtora Premiada'),
    (NULL,          'MD · Captação Própria Premium',      'OUTCOME_LEADS',  'ACTIVE', 'SCALING',  'BOF', 'localizacao_premium',       'scale',     7000, 3.0, 0.90, 1.75,  8, 14000, true,  'Imóveis selecionados pela Marketing Digital.',                      'Seleção Marketing Digital'),
    (NULL,          'MD · Captação Própria Financiamento','OUTCOME_LEADS',  'ACTIVE', 'STABLE',   'BOF', 'financiamento_facilitado',  'optimize',  8000, 1.9, 1.40, 2.10,  5, 11000, false, 'Condições especiais de financiamento.',                             'Financiamento Especial'),
    -- ===== SAÚDE DIGITAL (ideal 25 / crítico 60) =====
    (cli_gisele,    'Gisele · Atendimento Rápido',        'OUTCOME_LEADS',  'ACTIVE', 'SCALING',  'BOF', 'atendimento_rapido',        'scale',     6000, 3.2, 0.80, 1.70, 11, 12000, true,  'Atendimento no mesmo dia. Agende sua consulta.',                    'Atendimento no Mesmo Dia'),
    (cli_gisele,    'Gisele · Custo Acessível',           'OUTCOME_LEADS',  'ACTIVE', 'STABLE',   'MOF', 'custo_acessivel',           'optimize',  6500, 1.9, 1.20, 2.05,  5,  9000, false, 'Planos de saúde acessíveis para toda a família.',                   'Planos Acessíveis'),
    (cli_odonto,    'OdontoVida · Equipe Especializada',  'OUTCOME_LEADS',  'ACTIVE', 'STABLE',   'BOF', 'equipe_especializada',      'scale',     5800, 3.0, 0.82, 1.75, 10, 11000, true,  'Equipe odontológica especializada. Primeira avaliação grátis.',     'Equipe Especializada'),
    (cli_odonto,    'OdontoVida · Tecnologia Moderna',    'OUTCOME_TRAFFIC','ACTIVE', 'FATIGUED', 'TOF', 'tecnologia_moderna',        'pause',    10000, 0.60, 2.40, 2.45,  0,  9500, false, 'Tecnologia de ponta em odontologia.',                               'Tecnologia de Ponta'),
    (cli_odonto,    'OdontoVida · Custo Acessível',       'OUTCOME_LEADS',  'ACTIVE', 'FATIGUED', 'MOF', 'custo_acessivel',           'alert',     7200, 1.6, 1.30, 3.00,  5, 10000, false, 'Tratamento odontológico que cabe no orçamento.',                    'Cabe no Orçamento'),
    -- ===== VENDA DE CARROS (ideal 45 / crítico 100) =====
    (cli_automax,   'AutoMax · Preço Imbatível',          'OUTCOME_LEADS',  'ACTIVE', 'SCALING',  'BOF', 'preco_imbativel',           'scale',     8000, 2.8, 1.10, 1.80,  6, 18000, true,  'Os melhores preços da região. Confira o estoque.',                  'Preço Imbatível'),
    (cli_automax,   'AutoMax · Zero Entrada',             'OUTCOME_LEADS',  'ACTIVE', 'FATIGUED', 'MOF', 'zero_entrada',              'alert',     9000, 1.6, 1.55, 3.05,  4, 15000, false, 'Saia de carro novo com zero de entrada.',                           'Zero de Entrada'),
    (cli_automax,   'AutoMax · Consumo Eficiente',        'OUTCOME_LEADS',  'ACTIVE', 'STABLE',   'MOF', 'consumo_eficiente',         'optimize',  7500, 1.9, 1.45, 2.10,  4, 12000, false, 'Modelos econômicos que rodam mais por menos.',                      'Baixo Consumo'),
    (cli_rodaboa,   'RodaBoa · Garantia Estendida',       'OUTCOME_LEADS',  'ACTIVE', 'STABLE',   'BOF', 'garantia_estendida',        'scale',     7800, 2.7, 1.12, 1.85,  6, 17000, true,  'Garantia estendida de fábrica em todos os modelos.',                'Garantia Estendida'),
    (cli_rodaboa,   'RodaBoa · Tecnologia Embarcada',     'OUTCOME_TRAFFIC','PAUSED', 'PAUSED',   'TOF', 'tecnologia_embarcada',      'pause',    10500, 0.62, 2.60, 2.50,  0, 13000, false, 'Carros com a tecnologia mais avançada do mercado.',                 'Tecnologia Avançada'),
    (cli_rodaboa,   'RodaBoa · Zero Entrada',             'OUTCOME_LEADS',  'ACTIVE', 'FATIGUED', 'MOF', 'zero_entrada',              'alert',     8600, 1.6, 1.58, 3.10,  4, 14000, false, 'Realize o sonho do carro novo. Zero entrada.',                      'Sonho do Carro Novo'),
    -- ===== GERAL (ideal 30 / crítico 80) =====
    (cli_lojamix,   'Loja Mix · Oferta Especial',         'OUTCOME_LEADS',  'ACTIVE', 'SCALING',  'BOF', 'oferta_especial',           'scale',     7000, 3.0, 0.95, 1.80,  9, 13000, true,  'Ofertas especiais por tempo limitado. Aproveite.',                  'Oferta Especial'),
    (cli_lojamix,   'Loja Mix · Prova Social',            'OUTCOME_TRAFFIC','ACTIVE', 'FATIGUED', 'TOF', 'prova_social',              'pause',    10200, 0.59, 2.45, 2.42,  0, 10000, false, 'Mais de 10 mil clientes satisfeitos. Junte-se a eles.',             '10 mil Clientes'),
    (cli_lojamix,   'Loja Mix · Benefício Principal',     'OUTCOME_LEADS',  'ACTIVE', 'FATIGUED', 'MOF', 'beneficio_principal',       'alert',     8400, 1.6, 1.42, 3.00,  5, 11000, false, 'O benefício que você procura, no melhor custo.',                    'Melhor Custo-Benefício')
  ) AS t(client_id, cname, objective, status, lifecycle, funnel, angle, profile,
         base_impr, base_ctr, base_cpc, base_freq, leads_base, budget, video, body_txt, headline_txt)
LOOP
  v_idx  := v_idx + 1;
  v_camp := gen_random_uuid()::text;
  v_adset:= gen_random_uuid()::text;
  v_ad   := gen_random_uuid()::text;

  -- ── Campaign ──
  INSERT INTO campanhasmarketingdigital."Campaign"
    (id, tenant_id, client_id, "metaCampaignId", name, objective, status, "specialAdCategory",
     declared_angle, angle_source, lifecycle_status, lifecycle_changed_at, funnel_stage, "createdAt", "updatedAt")
  VALUES
    (v_camp, v_tenant_id, spec.client_id, 'seed_ms_' || LPAD(v_idx::text, 3, '0'),
     spec.cname, spec.objective, spec.status, NULL,
     spec.angle, 'declared', spec.lifecycle, NOW() - INTERVAL '5 days', spec.funnel,
     NOW() - INTERVAL '44 days', NOW());

  -- ── AdSet ──
  INSERT INTO campanhasmarketingdigital."AdSet"
    (id, "metaAdSetId", "campaignId", name, "dailyBudget", "startTime", "optimizationGoal",
     "billingEvent", "ageMin", "ageMax", genders, locations, interests, "scheduleDays", "createdAt")
  VALUES
    (v_adset, 'seed_ms_as_' || LPAD(v_idx::text, 3, '0'), v_camp, spec.cname || ' · AdSet',
     spec.budget, NOW() - INTERVAL '44 days', 'LEAD_GENERATION', 'IMPRESSIONS',
     25, 55, '{0}', '{"key":"BR:SP","name":"São Paulo"}'::jsonb, '[]'::jsonb, '{1,2,3,4,5}',
     NOW() - INTERVAL '44 days');

  -- ── Ad ──
  INSERT INTO campanhasmarketingdigital."Ad"
    (id, "metaAdId", "adSetId", name, status, "creativeType", images, body, headline, "linkUrl", "ctaType", "trackingId", "createdAt")
  VALUES
    (v_ad, 'seed_ms_ad_' || LPAD(v_idx::text, 3, '0'), v_adset, spec.cname || ' · Criativo',
     'ACTIVE', CASE WHEN spec.video THEN 'VIDEO' ELSE 'IMAGE' END, '{}',
     spec.body_txt, spec.headline_txt, spec.client_id::text, 'WHATSAPP_MESSAGE',
     'seed_ms_track_' || LPAD(v_idx::text, 3, '0'), NOW() - INTERVAL '44 days');

  -- ── Insights 44 dias + Leads ──
  FOR d IN 1..44 LOOP
    dt := (CURRENT_DATE - (44 - d) * INTERVAL '1 day')::DATE;

    IF spec.profile = 'scale' THEN
      v_impr  := spec.base_impr + d * 30 + (CASE WHEN EXTRACT(DOW FROM dt) IN (0,6) THEN -1100 ELSE 0 END);
      v_ctr   := spec.base_ctr + SIN(d * 0.3) * 0.5 + d * 0.012;
      v_cpc   := spec.base_cpc + COS(d * 0.2) * 0.10;
      v_freq  := spec.base_freq + SIN(d * 0.15) * 0.20;
      v_leads := spec.leads_base + (d % 5);
    ELSIF spec.profile = 'pause' THEN
      v_impr  := spec.base_impr + d * 20 + (CASE WHEN EXTRACT(DOW FROM dt) IN (0,6) THEN -1800 ELSE 0 END);
      v_ctr   := spec.base_ctr + SIN(d * 0.5) * 0.10;
      v_cpc   := spec.base_cpc + SIN(d * 0.3) * 0.30;
      v_freq  := spec.base_freq + d * 0.010;
      v_leads := 0;
    ELSIF spec.profile = 'alert' THEN
      v_impr  := GREATEST(2500, spec.base_impr - d * 25);
      v_ctr   := GREATEST(0.80, spec.base_ctr - d * 0.030);
      v_cpc   := spec.base_cpc + d * 0.020 + SIN(d * 0.3) * 0.12;
      v_freq  := spec.base_freq + d * 0.030 + SIN(d * 0.4) * 0.25;
      v_leads := GREATEST(1, spec.leads_base - (d / 15));
    ELSE -- optimize
      v_impr  := spec.base_impr + d * 35 + (CASE WHEN EXTRACT(DOW FROM dt) IN (0,6) THEN -900 ELSE 0 END);
      v_ctr   := spec.base_ctr + SIN(d * 0.4) * 0.22;
      v_cpc   := spec.base_cpc + COS(d * 0.2) * 0.12;
      v_freq  := spec.base_freq + d * 0.008;
      v_leads := spec.leads_base + (d % 3);
    END IF;

    v_reach  := ROUND(v_impr * 0.70);
    v_clicks := GREATEST(1, ROUND(v_impr * v_ctr / 100));
    v_spend  := v_clicks * v_cpc;
    v_cpc    := CASE WHEN v_clicks > 0 THEN v_spend / v_clicks ELSE 0 END;
    v_cpm    := CASE WHEN v_impr  > 0 THEN (v_spend / v_impr) * 1000 ELSE 0 END;
    v_conv   := ROUND(v_leads * 0.6);
    v_vv3    := CASE WHEN spec.video THEN ROUND(v_impr * 0.11) ELSE 0 END;

    INSERT INTO campanhasmarketingdigital."Insight"
      (id, tenant_id, "campaignId", "adSetId", date, impressions, reach, clicks,
       spend, cpc, cpm, ctr, conversions, frequency,
       video_views_3s, video_views_15s, video_views_25_pct, video_views_50_pct,
       video_views_75_pct, video_views_100_pct, thruplay_views, "createdAt")
    VALUES
      (gen_random_uuid()::text, v_tenant_id, v_camp, v_adset, dt,
       v_impr, v_reach, v_clicks,
       ROUND(v_spend::NUMERIC, 2), ROUND(v_cpc::NUMERIC, 4), ROUND(v_cpm::NUMERIC, 4),
       ROUND(v_ctr::NUMERIC, 4), v_conv, ROUND(v_freq::NUMERIC, 2),
       v_vv3, ROUND(v_vv3 * 0.55), ROUND(v_vv3 * 0.42), ROUND(v_vv3 * 0.28),
       ROUND(v_vv3 * 0.18), ROUND(v_vv3 * 0.11), ROUND(v_vv3 * 0.40), NOW());

    FOR v_lead_i IN 1..v_leads LOOP
      INSERT INTO campanhasmarketingdigital."Lead"
        (id, tenant_id, client_id, "campaignId", "adId", "phoneClicked",
         "utmSource", "utmMedium", "utmCampaign", "clickedAt")
      VALUES
        (gen_random_uuid()::text, v_tenant_id, spec.client_id, v_camp, v_ad,
         '551199' || LPAD((v_idx * 100 + v_lead_i)::text, 7, '0'),
         'meta', 'paid', 'seed_ms_' || LPAD(v_idx::text, 3, '0'),
         dt + (v_lead_i * INTERVAL '1 hour 17 minutes'));
    END LOOP;
  END LOOP;

END LOOP;

RAISE NOTICE '✅ Seed multi-segmento concluído — % campanhas (seed_ms_)', v_idx;

END $$;

-- ─── Verificação: por segmento e cliente ─────────────────────────────────────
SELECT
  s.name                                       AS segmento,
  COALESCE(cl.nome, 'Minha Empresa')           AS cliente,
  c.name                                       AS campanha,
  c.status,
  c.funnel_stage,
  COUNT(DISTINCT i.id)                         AS dias,
  ROUND(SUM(i.spend)::NUMERIC, 0)              AS gasto,
  COUNT(DISTINCT l.id)                         AS leads
FROM campanhasmarketingdigital."Campaign" c
LEFT JOIN public.clientes cl            ON cl.uuid = c.client_id
LEFT JOIN public.tenants  t             ON t.id    = c.tenant_id
LEFT JOIN public.system_segments s      ON s.id    = COALESCE(cl.segment_id, t.segment_id)
LEFT JOIN campanhasmarketingdigital."Insight" i ON i."campaignId" = c.id
LEFT JOIN campanhasmarketingdigital."Lead"    l ON l."campaignId" = c.id
WHERE c."metaCampaignId" LIKE 'seed_ms_%'
GROUP BY s.name, cl.nome, c.name, c.status, c.funnel_stage
ORDER BY s.name, cliente, gasto DESC;

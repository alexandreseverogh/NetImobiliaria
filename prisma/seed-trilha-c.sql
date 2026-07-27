-- TRILHA C — Fase 0 (docs/TESTE_RIGOROSO_LEADEVENTS_2026-07-22.md)
-- 5 campanhas de teste vinculadas ao cliente "TRILHA C — Cliente Teste"
-- (uuid 90847892-3328-46c5-973c-c3257a5ac86a), tenant Marketing Digital.
--
-- Benchmarks reais do segmento Imobiliário usados pra calcular os números (conferidos no banco):
-- cpl_ideal=35, cpl_critical=80, ctr_min=0.8%, ctr_scale=2.0%, frequency_max=3.0,
-- spend_no_lead=50, min_leads_scale=5, min_days_running=3.
--
-- Leads NÃO são semeados aqui (exceto Cenário 3/Google) — vêm da Fase 1, ao vivo:
--   Cenário 1: 15 cliques reais via /api/r/{trackingId}
--   Cenário 2: nenhum, de propósito (zero leads é o ponto do cenário)
--   Cenário 3: já semeado abaixo via Insight.conversions (mecanismo real do Google)
--   Cenário 4: 3 chamadas reais a POST /api/public/cta/ingest com ?ref={trackingId}
--   Cenário 5: 2 cliques reais via /api/r/{trackingId}

-- ── Cenário 1 — TRILHA C · Sucesso (Meta) ───────────────────────────────────
-- 5 dias, spend R$300, CTR 2,5% (> ctr_scale 2,0%), frequência baixa (~1,5, sem fadiga).
-- Leads=15 (Fase 1) → CPL=R$20 (< cpl_ideal) + CTR alto + leads>=5 → SCALE limpo.
INSERT INTO campanhasmarketingdigital."Campaign"
  (id, name, objective, status, "createdAt", "updatedAt", tenant_id, client_id, network_id, external_id, funnel_stage)
VALUES
  ('trilha-c-sucesso', 'TRILHA C · Sucesso', 'OUTCOME_LEADS', 'ACTIVE', now(), now(),
   'efbf62cf-9e28-4b31-a4f6-82a037412353', '90847892-3328-46c5-973c-c3257a5ac86a',
   '58ac3095-fbb3-405d-83d4-c1b89318bff4', '999100001', 'BOF')
ON CONFLICT (id) DO NOTHING;

INSERT INTO campanhasmarketingdigital."AdSet"
  (id, "campaignId", name, "dailyBudget", "startTime", "optimizationGoal", "billingEvent",
   "ageMin", "ageMax", genders, locations, "scheduleDays", "createdAt")
VALUES
  ('trilha-c-sucesso-as1', 'trilha-c-sucesso', 'TRILHA C · Sucesso — Grupo', 6000,
   '2026-07-22 09:00:00', 'LEAD_GENERATION', 'IMPRESSIONS', 25, 55, '{0}',
   '{"key":"BR:SP","name":"São Paulo"}', '{1,2,3,4,5,6,7}', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO campanhasmarketingdigital."Ad"
  (id, "adSetId", name, status, "creativeType", body, headline, "ctaType", "trackingId", "createdAt")
VALUES
  ('trilha-c-sucesso-ad1', 'trilha-c-sucesso-as1', 'TRILHA C · Sucesso — Anúncio', 'ACTIVE',
   'IMAGE', 'Apartamentos com condições especiais.', 'Seu novo lar te espera', 'WHATSAPP_MESSAGE',
   'trilha-c-sucesso-track', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO campanhasmarketingdigital."Insight"
  (id, "campaignId", "adSetId", "adId", date, impressions, clicks, spend, frequency, tenant_id)
VALUES
  ('trilha-c-sucesso-2026-07-22', 'trilha-c-sucesso', 'trilha-c-sucesso-as1', 'trilha-c-sucesso-ad1', '2026-07-22 12:00:00', 2000, 50, 60, 1.4, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-sucesso-2026-07-23', 'trilha-c-sucesso', 'trilha-c-sucesso-as1', 'trilha-c-sucesso-ad1', '2026-07-23 12:00:00', 2000, 50, 60, 1.5, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-sucesso-2026-07-24', 'trilha-c-sucesso', 'trilha-c-sucesso-as1', 'trilha-c-sucesso-ad1', '2026-07-24 12:00:00', 2000, 50, 60, 1.5, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-sucesso-2026-07-25', 'trilha-c-sucesso', 'trilha-c-sucesso-as1', 'trilha-c-sucesso-ad1', '2026-07-25 12:00:00', 2000, 50, 60, 1.6, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-sucesso-2026-07-26', 'trilha-c-sucesso', 'trilha-c-sucesso-as1', 'trilha-c-sucesso-ad1', '2026-07-26 12:00:00', 2000, 50, 60, 1.5, 'efbf62cf-9e28-4b31-a4f6-82a037412353')
ON CONFLICT (id) DO NOTHING;

-- ── Cenário 2 — TRILHA C · Crítico (Meta) ───────────────────────────────────
-- 4 dias, spend R$400, CTR 1,6% (ok, > ctr_min — só o gasto-sem-lead deve disparar),
-- ZERO leads (de propósito, nenhuma ação na Fase 1) → PAUSE "Gasto sem resultados".
INSERT INTO campanhasmarketingdigital."Campaign"
  (id, name, objective, status, "createdAt", "updatedAt", tenant_id, client_id, network_id, external_id, funnel_stage)
VALUES
  ('trilha-c-critico', 'TRILHA C · Crítico', 'OUTCOME_LEADS', 'ACTIVE', now(), now(),
   'efbf62cf-9e28-4b31-a4f6-82a037412353', '90847892-3328-46c5-973c-c3257a5ac86a',
   '58ac3095-fbb3-405d-83d4-c1b89318bff4', '999100002', 'BOF')
ON CONFLICT (id) DO NOTHING;

INSERT INTO campanhasmarketingdigital."AdSet"
  (id, "campaignId", name, "dailyBudget", "startTime", "optimizationGoal", "billingEvent",
   "ageMin", "ageMax", genders, locations, "scheduleDays", "createdAt")
VALUES
  ('trilha-c-critico-as1', 'trilha-c-critico', 'TRILHA C · Crítico — Grupo', 10000,
   '2026-07-23 09:00:00', 'LEAD_GENERATION', 'IMPRESSIONS', 25, 55, '{0}',
   '{"key":"BR:SP","name":"São Paulo"}', '{1,2,3,4,5,6,7}', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO campanhasmarketingdigital."Ad"
  (id, "adSetId", name, status, "creativeType", body, headline, "ctaType", "trackingId", "createdAt")
VALUES
  ('trilha-c-critico-ad1', 'trilha-c-critico-as1', 'TRILHA C · Crítico — Anúncio', 'ACTIVE',
   'IMAGE', 'Empreendimento de alto padrão.', 'Exclusividade e conforto', 'WHATSAPP_MESSAGE',
   'trilha-c-critico-track', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO campanhasmarketingdigital."Insight"
  (id, "campaignId", "adSetId", "adId", date, impressions, clicks, spend, frequency, tenant_id)
VALUES
  ('trilha-c-critico-2026-07-23', 'trilha-c-critico', 'trilha-c-critico-as1', 'trilha-c-critico-ad1', '2026-07-23 12:00:00', 2500, 40, 100, 1.7, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-critico-2026-07-24', 'trilha-c-critico', 'trilha-c-critico-as1', 'trilha-c-critico-ad1', '2026-07-24 12:00:00', 2500, 40, 100, 1.8, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-critico-2026-07-25', 'trilha-c-critico', 'trilha-c-critico-as1', 'trilha-c-critico-ad1', '2026-07-25 12:00:00', 2500, 40, 100, 1.9, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-critico-2026-07-26', 'trilha-c-critico', 'trilha-c-critico-as1', 'trilha-c-critico-ad1', '2026-07-26 12:00:00', 2500, 40, 100, 1.8, 'efbf62cf-9e28-4b31-a4f6-82a037412353')
ON CONFLICT (id) DO NOTHING;

-- ── Cenário 3 — TRILHA C · Atenção (Google) ─────────────────────────────────
-- 4 dias, spend R$520, conversions=8 (2/dia, JÁ semeado — leads do Google vêm de
-- Insight.conversions, não de clique) → CPL=R$65 (entre ideal e crítico) → OPTIMIZE/ALERT.
INSERT INTO campanhasmarketingdigital."Campaign"
  (id, name, objective, status, "createdAt", "updatedAt", tenant_id, client_id, network_id, external_id, funnel_stage)
VALUES
  ('trilha-c-atencao-google', 'TRILHA C · Atenção', 'OUTCOME_LEADS', 'ACTIVE', now(), now(),
   'efbf62cf-9e28-4b31-a4f6-82a037412353', '90847892-3328-46c5-973c-c3257a5ac86a',
   '2fe8a639-b674-446e-bfe7-a2b8fbfb40cf', '999100003', 'BOF')
ON CONFLICT (id) DO NOTHING;

INSERT INTO campanhasmarketingdigital."AdSet"
  (id, "campaignId", name, "dailyBudget", "startTime", "optimizationGoal", "billingEvent",
   "ageMin", "ageMax", genders, locations, "scheduleDays", "createdAt")
VALUES
  ('trilha-c-atencao-google-as1', 'trilha-c-atencao-google', 'TRILHA C · Atenção — Grupo de Anúncios', 13000,
   '2026-07-23 09:00:00', 'CONVERSIONS', 'IMPRESSIONS', 25, 55, '{0}',
   '{"key":"BR:SP","name":"São Paulo"}', '{1,2,3,4,5,6,7}', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO campanhasmarketingdigital."Insight"
  (id, "campaignId", "adSetId", date, impressions, clicks, spend, conversions, frequency,
   search_impression_share, search_budget_lost_is, search_rank_lost_is, tenant_id)
VALUES
  ('trilha-c-atencao-2026-07-23', 'trilha-c-atencao-google', 'trilha-c-atencao-google-as1', '2026-07-23 12:00:00', 8000, 100, 130, 2, 1.0, 45, 15, 5, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-atencao-2026-07-24', 'trilha-c-atencao-google', 'trilha-c-atencao-google-as1', '2026-07-24 12:00:00', 8000, 100, 130, 2, 1.0, 45, 15, 5, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-atencao-2026-07-25', 'trilha-c-atencao-google', 'trilha-c-atencao-google-as1', '2026-07-25 12:00:00', 8000, 100, 130, 2, 1.0, 45, 15, 5, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-atencao-2026-07-26', 'trilha-c-atencao-google', 'trilha-c-atencao-google-as1', '2026-07-26 12:00:00', 8000, 100, 130, 2, 1.0, 45, 15, 5, 'efbf62cf-9e28-4b31-a4f6-82a037412353')
ON CONFLICT (id) DO NOTHING;

-- ── Cenário 4 — TRILHA C · Site Próprio (Meta, Mecanismo C) ─────────────────
-- 3 dias, spend R$150, ctaType=LEARN_MORE apontando pro "site próprio do cliente"
-- (não WhatsApp) — testa o fix do `ref` ao vivo (Mecanismo C, /api/public/cta/ingest).
-- Leads=3 (Fase 1, via curl real) → CPL=R$50.
INSERT INTO campanhasmarketingdigital."Campaign"
  (id, name, objective, status, "createdAt", "updatedAt", tenant_id, client_id, network_id, external_id, funnel_stage)
VALUES
  ('trilha-c-site-proprio', 'TRILHA C · Site Próprio', 'OUTCOME_TRAFFIC', 'ACTIVE', now(), now(),
   'efbf62cf-9e28-4b31-a4f6-82a037412353', '90847892-3328-46c5-973c-c3257a5ac86a',
   '58ac3095-fbb3-405d-83d4-c1b89318bff4', '999100004', 'MOF')
ON CONFLICT (id) DO NOTHING;

INSERT INTO campanhasmarketingdigital."AdSet"
  (id, "campaignId", name, "dailyBudget", "startTime", "optimizationGoal", "billingEvent",
   "ageMin", "ageMax", genders, locations, "scheduleDays", "createdAt")
VALUES
  ('trilha-c-site-proprio-as1', 'trilha-c-site-proprio', 'TRILHA C · Site Próprio — Grupo', 5000,
   '2026-07-24 09:00:00', 'LINK_CLICKS', 'IMPRESSIONS', 25, 55, '{0}',
   '{"key":"BR:SP","name":"São Paulo"}', '{1,2,3,4,5,6,7}', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO campanhasmarketingdigital."Ad"
  (id, "adSetId", name, status, "creativeType", body, headline, "ctaType", "linkUrl", "trackingId", "createdAt")
VALUES
  ('trilha-c-site-proprio-ad1', 'trilha-c-site-proprio-as1', 'TRILHA C · Site Próprio — Anúncio', 'ACTIVE',
   'IMAGE', 'Conheça nosso catálogo completo no site.', 'Veja todos os imóveis', 'LEARN_MORE',
   'https://trilha-c-cliente-teste.com.br/imoveis', 'trilha-c-site-track', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO campanhasmarketingdigital."Insight"
  (id, "campaignId", "adSetId", "adId", date, impressions, clicks, spend, frequency, tenant_id)
VALUES
  ('trilha-c-site-2026-07-24', 'trilha-c-site-proprio', 'trilha-c-site-proprio-as1', 'trilha-c-site-proprio-ad1', '2026-07-24 12:00:00', 3000, 60, 50, 1.4, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-site-2026-07-25', 'trilha-c-site-proprio', 'trilha-c-site-proprio-as1', 'trilha-c-site-proprio-ad1', '2026-07-25 12:00:00', 3000, 60, 50, 1.5, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-site-2026-07-26', 'trilha-c-site-proprio', 'trilha-c-site-proprio-as1', 'trilha-c-site-proprio-ad1', '2026-07-26 12:00:00', 3000, 60, 50, 1.6, 'efbf62cf-9e28-4b31-a4f6-82a037412353')
ON CONFLICT (id) DO NOTHING;

-- ── Cenário 5 — TRILHA C · Fadiga (Meta, opcional) ──────────────────────────
-- 6 dias, spend R$250, frequência crescente 2,2x → 3,9x (média 3,1x > frequency_max 3,0x,
-- mas < 3,9x — dispara ALERT normal, NÃO o REFRESH_CREATIVE de fadiga crítica).
-- Leads=2 (Fase 1) → CPL=R$125 (> cpl_critical 80) — DOWNSCALE também deve disparar
-- (esperado: CPL genuinamente crítico, não é bug se aparecer junto do ALERT de frequência).
INSERT INTO campanhasmarketingdigital."Campaign"
  (id, name, objective, status, "createdAt", "updatedAt", tenant_id, client_id, network_id, external_id, funnel_stage)
VALUES
  ('trilha-c-fadiga', 'TRILHA C · Fadiga', 'OUTCOME_LEADS', 'ACTIVE', now(), now(),
   'efbf62cf-9e28-4b31-a4f6-82a037412353', '90847892-3328-46c5-973c-c3257a5ac86a',
   '58ac3095-fbb3-405d-83d4-c1b89318bff4', '999100005', 'BOF')
ON CONFLICT (id) DO NOTHING;

INSERT INTO campanhasmarketingdigital."AdSet"
  (id, "campaignId", name, "dailyBudget", "startTime", "optimizationGoal", "billingEvent",
   "ageMin", "ageMax", genders, locations, "scheduleDays", "createdAt")
VALUES
  ('trilha-c-fadiga-as1', 'trilha-c-fadiga', 'TRILHA C · Fadiga — Grupo', 4200,
   '2026-07-21 09:00:00', 'LEAD_GENERATION', 'IMPRESSIONS', 25, 55, '{0}',
   '{"key":"BR:SP","name":"São Paulo"}', '{1,2,3,4,5,6,7}', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO campanhasmarketingdigital."Ad"
  (id, "adSetId", name, status, "creativeType", body, headline, "ctaType", "trackingId", "createdAt")
VALUES
  ('trilha-c-fadiga-ad1', 'trilha-c-fadiga-as1', 'TRILHA C · Fadiga — Anúncio', 'ACTIVE',
   'IMAGE', 'Últimas unidades disponíveis.', 'Não perca essa oportunidade', 'WHATSAPP_MESSAGE',
   'trilha-c-fadiga-track', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO campanhasmarketingdigital."Insight"
  (id, "campaignId", "adSetId", "adId", date, impressions, clicks, spend, frequency, tenant_id)
VALUES
  ('trilha-c-fadiga-2026-07-21', 'trilha-c-fadiga', 'trilha-c-fadiga-as1', 'trilha-c-fadiga-ad1', '2026-07-21 12:00:00', 1500, 18, 40, 2.2, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-fadiga-2026-07-22', 'trilha-c-fadiga', 'trilha-c-fadiga-as1', 'trilha-c-fadiga-ad1', '2026-07-22 12:00:00', 1500, 18, 40, 2.6, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-fadiga-2026-07-23', 'trilha-c-fadiga', 'trilha-c-fadiga-as1', 'trilha-c-fadiga-ad1', '2026-07-23 12:00:00', 1500, 18, 40, 3.0, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-fadiga-2026-07-24', 'trilha-c-fadiga', 'trilha-c-fadiga-as1', 'trilha-c-fadiga-ad1', '2026-07-24 12:00:00', 1500, 18, 45, 3.3, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-fadiga-2026-07-25', 'trilha-c-fadiga', 'trilha-c-fadiga-as1', 'trilha-c-fadiga-ad1', '2026-07-25 12:00:00', 1500, 18, 40, 3.6, 'efbf62cf-9e28-4b31-a4f6-82a037412353'),
  ('trilha-c-fadiga-2026-07-26', 'trilha-c-fadiga', 'trilha-c-fadiga-as1', 'trilha-c-fadiga-ad1', '2026-07-26 12:00:00', 1500, 18, 45, 3.9, 'efbf62cf-9e28-4b31-a4f6-82a037412353')
ON CONFLICT (id) DO NOTHING;

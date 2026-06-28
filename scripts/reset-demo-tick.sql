-- =====================================================================
-- RESET DEMO TICK — provoca SCALE + PAUSE no próximo tick
-- Marketing Digital tenant: efbf62cf-9e28-4b31-a4f6-82a037412353
-- =====================================================================

BEGIN;

-- 1) Limpa AgentActions das últimas 24h (dedup bypass)
DELETE FROM campanhasmarketingdigital."AgentAction"
WHERE tenant_id = 'efbf62cf-9e28-4b31-a4f6-82a037412353';

-- ── SCALE ─────────────────────────────────────────────────────────────
-- Alto Padrão — Alphaville (47d70729): CTR 3.55% + 486 leads → SCALE ✓
-- Gisele · Atendimento Rápido (b2e46d3c): CTR 3.48% + 574 leads → SCALE ✓
-- (não alteramos — já estão acima de ctr_scale=2% com leads > min_leads_scale=8)

-- ── PAUSE via CTR baixo ────────────────────────────────────────────────
-- RodaBoa · Zero Entrada (69e71118): baixar CTR para 0.3% (abaixo de ctr_min=0.8%)
UPDATE campanhasmarketingdigital."Insight"
SET ctr    = 0.003,
    clicks = GREATEST(1, ROUND((impressions * 0.003 / 100)::numeric, 0)::int)
WHERE "campaignId" = '69e71118-b157-47fd-afb4-162f124f4401'
  AND date >= NOW() - INTERVAL '15 days';

-- ── PAUSE via gasto sem lead ───────────────────────────────────────────
-- Smart Tower Lançamento (f1531801): deletar leads + garantir spend > 50
DELETE FROM campanhasmarketingdigital."Lead"
WHERE "campaignId" = 'f1531801-6454-4f03-8363-24072a1796ab';

UPDATE campanhasmarketingdigital."Insight"
SET spend = 70
WHERE "campaignId" = 'f1531801-6454-4f03-8363-24072a1796ab'
  AND date >= NOW() - INTERVAL '5 days';

-- ── NEUTRAS: baixar CTR para 1.5% (acima de ctr_min, abaixo de ctr_scale) ──
-- Evita que todas as campanhas disparem SCALE ao mesmo tempo
UPDATE campanhasmarketingdigital."Insight"
SET ctr    = 0.015,
    clicks = GREATEST(1, ROUND((impressions * 0.015 / 100)::numeric, 0)::int)
WHERE "campaignId" IN (
  'af29d595-3a06-41f6-9936-0b410726e761',  -- Alexandre · Localização Premium
  '16c4d79e-6464-4547-8e12-42de20cb3651',  -- Alexandre · Últimas Unidades
  '2bd59ada-1bc3-4493-983b-447031cbdb61',  -- AutoMax · Consumo Eficiente
  '50c258ec-01eb-47a5-9b96-e2d89345dedc',  -- AutoMax · Preço Imbatível
  'c730ceb3-40f3-4337-9a74-36db5c5aeaf0',  -- AutoMax · Zero Entrada
  '5f68209d-bbff-4270-9db1-583830e5082e',  -- Gisele · Custo Acessível
  '2d7fe897-542d-404f-aac0-0367654879f0',  -- Loja Mix · Oferta Especial
  '74cde51f-c0bc-4e8a-8deb-be1a107b654f',  -- MD · Captação Própria Financiamento
  'e30e765f-48b8-4b22-986d-a7a83f72235c',  -- MD · Captação Própria Premium
  '8b0a4697-e6e3-4afb-b4c5-c5631ba503dc',  -- OdontoVida · Equipe Especializada
  '89d3c3d3-0eb9-4906-bc8c-d480d64e1528',  -- Premium · Diferencial Construtora
  '35c026e0-9071-4315-81fc-e1150f7c32f9',  -- Premium · Financiamento Facilitado
  '60e4fc54-2792-4cf5-81b0-8925beb670ea',  -- RodaBoa · Garantia Estendida
  '297ead04-40b4-4580-b0fe-0018ed999e25',  -- Zona Sul — Família
  '89105613-58b7-4816-8130-fa78766ab0ce'   -- Reserva Verde (nova)
)
AND date >= NOW() - INTERVAL '15 days';

COMMIT;

-- Verificação rápida
SELECT
  c.name,
  ROUND(AVG(i.ctr)::numeric, 4)   AS avg_ctr,
  COUNT(DISTINCT l.id)             AS leads,
  CASE
    WHEN ROUND(AVG(i.ctr)::numeric,4) >= 0.02
         AND COUNT(DISTINCT l.id) >= 5  THEN 'SCALE esperado'
    WHEN ROUND(AVG(i.ctr)::numeric,4) < 0.008
         AND COUNT(i.id) >= 3           THEN 'PAUSE esperado (CTR)'
    WHEN COUNT(DISTINCT l.id) = 0
         AND SUM(i.spend) > 50          THEN 'PAUSE esperado (spend)'
    ELSE 'neutro'
  END AS acao_esperada
FROM campanhasmarketingdigital."Campaign" c
JOIN campanhasmarketingdigital."Insight" i ON i."campaignId" = c.id
LEFT JOIN campanhasmarketingdigital."Lead" l ON l."campaignId" = c.id
WHERE c.tenant_id = 'efbf62cf-9e28-4b31-a4f6-82a037412353'
  AND c.status = 'ACTIVE'
GROUP BY c.id, c.name
ORDER BY acao_esperada, c.name;

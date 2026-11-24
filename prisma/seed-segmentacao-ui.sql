-- ═════════════════════════════════════════════════════════════════════════════
-- SEED DE TESTE — quebras de desempenho (aba Segmentação) — SOMENTE LOCAL
-- Tenant: Marketing Digital (efbf62cf-9e28-4b31-a4f6-82a037412353)
--
-- Gera linhas fictícias em campanhasmarketingdigital."InsightBreakdown" para
-- 6 campanhas existentes, nos últimos 30 dias, cobrindo:
--   • age_gender  → 4 faixas × 2 gêneros (com 1 célula propositalmente vazia)
--   • region      → 18 regiões (testa o Top N: 5 / 10 / 15)
--   • hour        → 24 horas, com pico à noite
--
-- Idempotente: apaga antes de inserir (só as linhas com prefixo seed_ui_).
-- Para REMOVER depois, rode apenas o bloco "LIMPEZA" no final.
-- ═════════════════════════════════════════════════════════════════════════════

BEGIN;

-- 0) Limpeza prévia (idempotência)
DELETE FROM campanhasmarketingdigital."InsightBreakdown"
 WHERE tenant_id = 'efbf62cf-9e28-4b31-a4f6-82a037412353'::uuid
   AND campaign_id IN (
     '47d70729-4981-4f3c-9fe4-991297f38af4',
     '2bd59ada-1bc3-4493-983b-447031cbdb61',
     'b2e46d3c-e341-4041-ac82-a4fbf433be26',
     '89d3c3d3-0eb9-4906-bc8c-d480d64e1528',
     '850af41e-5f4b-4c05-a21b-42b44ff29abe',
     '3b1393ca-57ca-4ec2-9509-435c881c7d3a');

-- 1) Gera as linhas (uma por campanha × dia × chave de quebra)
WITH camps AS (
  SELECT unnest(ARRAY[
    '47d70729-4981-4f3c-9fe4-991297f38af4',
    '2bd59ada-1bc3-4493-983b-447031cbdb61',
    'b2e46d3c-e341-4041-ac82-a4fbf433be26',
    '89d3c3d3-0eb9-4906-bc8c-d480d64e1528',
    '850af41e-5f4b-4c05-a21b-42b44ff29abe',
    '3b1393ca-57ca-4ec2-9509-435c881c7d3a'
  ]) AS campaign_id
),
days AS (
  SELECT generate_series(CURRENT_DATE - 29, CURRENT_DATE, interval '1 day')::date AS d
),
-- Faixas etárias × gênero. O "unknown" fica vazio de propósito (célula sem dado)
age_gender AS (
  SELECT * FROM (VALUES
    ('18-24|male',   1.6), ('18-24|female', 1.4),
    ('25-34|male',   2.2), ('25-34|female', 2.6),
    ('35-44|male',   1.8), ('35-44|female', 2.0),
    ('45-54|male',   1.1), ('45-54|female', 1.3)
  ) AS t(breakdown_key, weight)
),
regions AS (
  SELECT * FROM (VALUES
    ('Recife',1.9),('Olinda',1.2),('Jaboatão dos Guararapes',1.4),('Paulista',0.9),
    ('Cabo de Santo Agostinho',0.5),('Camaragibe',0.6),('São Lourenço da Mata',0.4),
    ('Abreu e Lima',0.5),('Igarassu',0.3),('Ipojuca',0.6),('Moreno',0.3),
    ('Goiana',0.3),('Vitória de Santo Antão',0.4),('Itamaracá',0.2),
    ('Ipojuca Litoral',0.5),('Escada',0.2),('Gravatá',0.3),('Caruaru',0.7)
  ) AS t(breakdown_key, weight)
),
-- Horas: pico entre 19h e 22h (horário nobre), vale de madrugada
hours AS (
  SELECT h AS breakdown_key,
         CASE
           WHEN h BETWEEN 19 AND 22 THEN 2.6
           WHEN h BETWEEN 12 AND 18 THEN 1.5
           WHEN h BETWEEN 8  AND 11 THEN 1.1
           WHEN h BETWEEN 0  AND 5  THEN 0.2
           ELSE 0.8
         END AS weight
    FROM generate_series(0, 23) AS h
),
-- Escala diária de investimento e leads por campanha (valores fictícios plausíveis)
base AS (
  SELECT c.campaign_id, d.d,
         (25 + (abs(hashtext(c.campaign_id || d.d::text)) % 55))::numeric AS daily_spend
    FROM camps c CROSS JOIN days d
),
rows_age AS (
  SELECT b.campaign_id, b.d, 'age_gender'::varchar AS breakdown_type, ag.breakdown_key,
         round((b.daily_spend * ag.weight / 10)::numeric, 2) AS spend,
         (1 + (abs(hashtext(b.campaign_id || ag.breakdown_key || b.d::text)) % 40)) * ag.weight::int AS impressions,
         ((abs(hashtext(b.campaign_id || ag.breakdown_key || b.d::text)) % 60) + 5) AS clicks,
         (abs(hashtext(b.campaign_id || ag.breakdown_key || b.d::text)) % 4) AS leads
    FROM base b CROSS JOIN age_gender ag
),
rows_region AS (
  SELECT b.campaign_id, b.d, 'region'::varchar, r.breakdown_key,
         round((b.daily_spend * r.weight / 8)::numeric, 2),
         (1 + (abs(hashtext(b.campaign_id || r.breakdown_key || b.d::text)) % 60)) * r.weight::int,
         ((abs(hashtext(b.campaign_id || r.breakdown_key || b.d::text)) % 30) + 2),
         (abs(hashtext(b.campaign_id || r.breakdown_key || b.d::text)) % 3)
    FROM base b CROSS JOIN regions r
),
rows_hour AS (
  SELECT b.campaign_id, b.d, 'hour'::varchar, h.breakdown_key::text,
         round((b.daily_spend * h.weight / 24)::numeric, 2),
         (1 + (abs(hashtext(b.campaign_id || h.breakdown_key::text || b.d::text)) % 50)) * h.weight::int,
         ((abs(hashtext(b.campaign_id || h.breakdown_key::text || b.d::text)) % 25) + 1),
         (abs(hashtext(b.campaign_id || h.breakdown_key::text || b.d::text)) % 3)
    FROM base b CROSS JOIN hours h
),
all_rows AS (
  SELECT * FROM rows_age
  UNION ALL SELECT * FROM rows_region
  UNION ALL SELECT * FROM rows_hour
)
INSERT INTO campanhasmarketingdigital."InsightBreakdown"
  (tenant_id, campaign_id, date, breakdown_type, breakdown_key,
   impressions, clicks, reach, leads, spend)
SELECT 'efbf62cf-9e28-4b31-a4f6-82a037412353'::uuid,
       campaign_id, d, breakdown_type,
       -- prefixo seed_ui_ só nas chaves de região, para a limpeza segura
       CASE WHEN breakdown_type = 'region' THEN 'seed_ui_' || breakdown_key ELSE breakdown_key END,
       impressions::int, clicks::int, (impressions * 0.8)::int, leads::int, spend
  FROM all_rows
ON CONFLICT (campaign_id, date, breakdown_type, breakdown_key) DO NOTHING;

COMMIT;

-- ═════════════════════════════════════════════════════════════════════════════
-- LIMPEZA (rode quando quiser remover os dados fictícios)
-- ═════════════════════════════════════════════════════════════════════════════
-- DELETE FROM campanhasmarketingdigital."InsightBreakdown"
--  WHERE tenant_id = 'efbf62cf-9e28-4b31-a4f6-82a037412353'::uuid
--    AND campaign_id IN (
--      '47d70729-4981-4f3c-9fe4-991297f38af4',
--      '2bd59ada-1bc3-4493-983b-447031cbdb61',
--      'b2e46d3c-e341-4041-ac82-a4fbf433be26',
--      '89d3c3d3-0eb9-4906-bc8c-d480d64e1528',
--      '850af41e-5f4b-4c05-a21b-42b44ff29abe',
--      '3b1393ca-57ca-4ec2-9509-435c881c7d3a');

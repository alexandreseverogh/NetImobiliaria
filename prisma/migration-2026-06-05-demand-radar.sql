-- FASE 18.1: Radar de Demanda com Google Trends
-- Migration: 2026-06-05
-- IMPORTANTE: Aplicar apenas localmente (VPS migration strategy: all-at-once later)

-- ============================================================
-- 1. Tabela de termos de busca por ângulo (PT-BR)
-- ============================================================
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital.angle_search_terms (
  id          SERIAL PRIMARY KEY,
  angle       VARCHAR(50) NOT NULL,
  term        VARCHAR(200) NOT NULL,
  weight      SMALLINT NOT NULL DEFAULT 1,  -- 1=primary, 2=secondary
  locale      VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
  geo         VARCHAR(10) NOT NULL DEFAULT 'BR',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (angle, term)
);

COMMENT ON TABLE campanhasmarketingdigital.angle_search_terms IS
  'Termos de busca Google Trends por ângulo de comunicação (PT-BR, Brasil)';

-- Sementes: ângulos × termos primários
INSERT INTO campanhasmarketingdigital.angle_search_terms (angle, term, weight) VALUES
  -- investment
  ('investment', 'apartamento para investimento',  1),
  ('investment', 'imóvel para renda',              2),
  ('investment', 'investir em imóvel',             2),
  -- lifestyle
  ('lifestyle',  'apartamento de luxo',            1),
  ('lifestyle',  'condomínio fechado',             2),
  ('lifestyle',  'imóvel com piscina',             2),
  -- family
  ('family',     'apartamento família',            1),
  ('family',     'casa para família',              1),
  ('family',     'comprar casa',                   2),
  -- price
  ('price',      'apartamento barato',             1),
  ('price',      'imóvel financiamento',           1),
  ('price',      'minha casa minha vida',          2),
  -- urgency
  ('urgency',    'lançamento imobiliário',         1),
  ('urgency',    'comprar apartamento agora',      2),
  ('urgency',    'oferta imóvel',                  2),
  -- social
  ('social',     'condomínio clube',               1),
  ('social',     'lazer condomínio',               2),
  ('social',     'área de lazer apartamento',      2),
  -- luxury
  ('luxury',     'apartamento alto padrão',        1),
  ('luxury',     'cobertura duplex',               2),
  ('luxury',     'imóvel alto padrão',             2),
  -- other
  ('other',      'comprar imóvel',                 1),
  ('other',      'imobiliária',                    2),
  ('other',      'corretor imóvel',                2)
ON CONFLICT (angle, term) DO NOTHING;

-- ============================================================
-- 2. Tabela de sinais exógenos (snapshot diário por ângulo)
-- ============================================================
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital.exogenous_signals (
  id          BIGSERIAL PRIMARY KEY,
  angle       VARCHAR(50)  NOT NULL,
  signal_date DATE         NOT NULL,
  score       NUMERIC(6,2) NOT NULL,   -- 0-100 normalizado
  raw_values  JSONB        NOT NULL DEFAULT '[]',  -- série temporal raw
  term_used   VARCHAR(200) NOT NULL,
  geo         VARCHAR(10)  NOT NULL DEFAULT 'BR',
  source      VARCHAR(50)  NOT NULL DEFAULT 'google_trends',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (angle, signal_date, geo)
);

CREATE INDEX IF NOT EXISTS idx_exogenous_signals_date
  ON campanhasmarketingdigital.exogenous_signals (signal_date DESC);

CREATE INDEX IF NOT EXISTS idx_exogenous_signals_angle_date
  ON campanhasmarketingdigital.exogenous_signals (angle, signal_date DESC);

COMMENT ON TABLE campanhasmarketingdigital.exogenous_signals IS
  'Sinais de demanda externos (Google Trends) por ângulo de comunicação';

-- ============================================================
-- 3. Cache diário do Radar de Demanda por tenant/client
-- ============================================================
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital.demand_radar_cache (
  id            BIGSERIAL PRIMARY KEY,
  cache_date    DATE         NOT NULL,
  tenant_id     VARCHAR(100) NOT NULL DEFAULT 'global',
  client_id     INTEGER,
  radar_data    JSONB        NOT NULL,  -- { angles: [...], quadrants: [...], generatedAt: ... }
  endogenous_period_days INTEGER NOT NULL DEFAULT 30,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Unicidade por data+tenant quando client_id é NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_demand_radar_cache_global
  ON campanhasmarketingdigital.demand_radar_cache (cache_date, tenant_id)
  WHERE client_id IS NULL;

-- Unicidade por data+tenant+client quando client_id é preenchido
CREATE UNIQUE INDEX IF NOT EXISTS idx_demand_radar_cache_client
  ON campanhasmarketingdigital.demand_radar_cache (cache_date, tenant_id, client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_demand_radar_cache_lookup
  ON campanhasmarketingdigital.demand_radar_cache (cache_date DESC, tenant_id, client_id);

COMMENT ON TABLE campanhasmarketingdigital.demand_radar_cache IS
  'Cache diário do Radar de Demanda (fusão endógeno × exógeno) por tenant/client';

-- ============================================================
-- 4. Template de prompt para análise do Radar (ZERO HARDCODE)
-- ============================================================
INSERT INTO public.system_prompt_templates (
  template_key,
  title,
  content,
  variables,
  is_active,
  created_at,
  updated_at
)
VALUES (
  'demand_radar_actions',
  'Radar de Demanda — Recomendações',
  E'Você é um estrategista de marketing imobiliário digital especializado em alocação de budget.\n\nCom base no Radar de Demanda abaixo, gere recomendações concisas por ângulo.\n\nRadar:\n{{radar_json}}\n\nQuadrantes:\n- oceano-azul: demanda externa alta, presença interna baixa → OPORTUNIDADE — aumentar investimento neste ângulo\n- saturado: demanda externa alta, presença interna alta → MANTER — ângulo competitivo, otimize CPL\n- vigiar: demanda externa baixa, presença interna alta → ATENÇÃO — mercado esfriando, prepare pivot\n- ponto-morto: demanda externa baixa, presença interna baixa → PAUSAR — baixa prioridade no momento\n\nRegras:\n1. Use português do Brasil, linguagem direta e profissional\n2. Máximo 1 frase por ângulo\n3. Priorize os ângulos oceano-azul primeiro\n4. Não repita informações já visíveis no quadrante',
  '["radar_json"]'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (template_key, version) WHERE segment_id IS NULL
DO UPDATE SET
  content    = EXCLUDED.content,
  variables  = EXCLUDED.variables,
  updated_at = NOW();

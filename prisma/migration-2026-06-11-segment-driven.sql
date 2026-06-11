-- FASE 18.2: Dashboard dirigido por Segmento
-- Migration: 2026-06-11
-- IMPORTANTE: Aplicar apenas localmente (VPS migra tudo de uma vez depois).
--
-- Substitui a fundação global da FASE 18.1 (angle_search_terms fixo em imóveis)
-- por uma fonte de verdade POR SEGMENTO: segment_angle_terms.
-- Ângulos espelham system_segments.creative_taxonomy.angles (ZERO HARDCODE).

-- ============================================================
-- 1. Remove a fundação global antiga (sem dados de produção)
-- ============================================================
DROP TABLE IF EXISTS campanhasmarketingdigital.angle_search_terms CASCADE;

-- ============================================================
-- 2. Nova fonte de verdade: termos de ângulo por segmento
--    Usada por: vértices do radar, rótulos de ângulo, termos do
--    Google Trends e opções de ângulo do wizard.
-- ============================================================
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital.segment_angle_terms (
  id           BIGSERIAL PRIMARY KEY,
  segment_id   UUID         NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  angle_slug   VARCHAR(60)  NOT NULL,   -- deve casar com creative_taxonomy.angles
  angle_label  VARCHAR(120) NOT NULL,   -- rótulo p/ UI (editável)
  search_term  VARCHAR(200) NOT NULL,   -- termo PT-BR p/ Google Trends
  weight       SMALLINT     NOT NULL DEFAULT 1,
  geo          VARCHAR(10)  NOT NULL DEFAULT 'BR',
  locale       VARCHAR(10)  NOT NULL DEFAULT 'pt-BR',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (segment_id, angle_slug, search_term)
);

CREATE INDEX IF NOT EXISTS idx_segment_angle_terms_segment
  ON campanhasmarketingdigital.segment_angle_terms (segment_id, angle_slug);

COMMENT ON TABLE campanhasmarketingdigital.segment_angle_terms IS
  'Fonte única por segmento: ângulos (slug+rótulo) e termos de busca Google Trends. ZERO HARDCODE.';

-- Seed: um termo PT-BR por ângulo de cada segmento ativo (master não tem ângulos).
-- segment_id resolvido por slug. Editável depois; pode haver vários termos por ângulo.
INSERT INTO campanhasmarketingdigital.segment_angle_terms (segment_id, angle_slug, angle_label, search_term)
SELECT s.id, v.angle_slug, v.angle_label, v.search_term
FROM (
  VALUES
    -- Imobiliário
    ('imobiliaria', 'valor_mensalidade',        'Valor da Parcela',          'apartamento financiamento'),
    ('imobiliaria', 'localizacao_premium',      'Localização Premium',       'apartamento bem localizado'),
    ('imobiliaria', 'diferencial_construtora',  'Diferencial da Construtora','construtora confiável'),
    ('imobiliaria', 'urgencia_unidades',        'Últimas Unidades',          'lançamento imobiliário'),
    ('imobiliaria', 'financiamento_facilitado', 'Financiamento Facilitado',  'minha casa minha vida'),
    -- Venda de Carros
    ('carros', 'preco_imbativel',       'Preço Imbatível',      'carro barato'),
    ('carros', 'zero_entrada',          'Zero Entrada',         'carro zero entrada'),
    ('carros', 'tecnologia_embarcada',  'Tecnologia Embarcada', 'carro com multimídia'),
    ('carros', 'consumo_eficiente',     'Consumo Eficiente',    'carro econômico'),
    ('carros', 'garantia_estendida',    'Garantia Estendida',   'garantia estendida carro'),
    -- Saúde Digital
    ('saude', 'custo_acessivel',       'Custo Acessível',      'plano de saúde barato'),
    ('saude', 'equipe_especializada',  'Equipe Especializada', 'médico especialista'),
    ('saude', 'tecnologia_moderna',    'Tecnologia Moderna',   'telemedicina'),
    ('saude', 'atendimento_rapido',    'Atendimento Rápido',   'consulta médica rápida'),
    -- Geral
    ('geral', 'beneficio_principal', 'Benefício Principal', 'melhor produto'),
    ('geral', 'diferencial',         'Diferencial',         'qualidade premium'),
    ('geral', 'prova_social',        'Prova Social',        'avaliações de clientes'),
    ('geral', 'oferta_especial',     'Oferta Especial',     'promoção')
) AS v(seg_slug, angle_slug, angle_label, search_term)
JOIN public.system_segments s ON s.slug = v.seg_slug
ON CONFLICT (segment_id, angle_slug, search_term) DO NOTHING;

-- ============================================================
-- 3. exogenous_signals — recriada com segment_id
--    (sem dados de produção; o cron repopula por segmento)
-- ============================================================
DROP TABLE IF EXISTS campanhasmarketingdigital.exogenous_signals CASCADE;

CREATE TABLE campanhasmarketingdigital.exogenous_signals (
  id          BIGSERIAL PRIMARY KEY,
  segment_id  UUID         NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  angle       VARCHAR(60)  NOT NULL,   -- angle_slug
  signal_date DATE         NOT NULL,
  score       NUMERIC(6,2) NOT NULL,   -- 0-100
  raw_values  JSONB        NOT NULL DEFAULT '[]',
  term_used   VARCHAR(200) NOT NULL,
  geo         VARCHAR(10)  NOT NULL DEFAULT 'BR',
  source      VARCHAR(50)  NOT NULL DEFAULT 'google_trends',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (segment_id, angle, signal_date, geo)
);

CREATE INDEX idx_exogenous_signals_seg_date
  ON campanhasmarketingdigital.exogenous_signals (segment_id, signal_date DESC);

COMMENT ON TABLE campanhasmarketingdigital.exogenous_signals IS
  'Sinais de demanda externos (Google Trends) por segmento × ângulo × dia.';

-- ============================================================
-- 4. demand_radar_cache — recriada com segment_id
-- ============================================================
DROP TABLE IF EXISTS campanhasmarketingdigital.demand_radar_cache CASCADE;

CREATE TABLE campanhasmarketingdigital.demand_radar_cache (
  id            BIGSERIAL PRIMARY KEY,
  cache_date    DATE         NOT NULL,
  tenant_id     VARCHAR(100) NOT NULL DEFAULT 'global',
  segment_id    UUID         NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  client_id     UUID,
  radar_data    JSONB        NOT NULL,
  endogenous_period_days INTEGER NOT NULL DEFAULT 30,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Unicidade por data+tenant+segmento quando client_id é NULL (agregado)
CREATE UNIQUE INDEX idx_demand_radar_cache_seg_global
  ON campanhasmarketingdigital.demand_radar_cache (cache_date, tenant_id, segment_id)
  WHERE client_id IS NULL;

-- Unicidade por data+tenant+segmento+cliente
CREATE UNIQUE INDEX idx_demand_radar_cache_seg_client
  ON campanhasmarketingdigital.demand_radar_cache (cache_date, tenant_id, segment_id, client_id)
  WHERE client_id IS NOT NULL;

CREATE INDEX idx_demand_radar_cache_lookup
  ON campanhasmarketingdigital.demand_radar_cache (cache_date DESC, tenant_id, segment_id, client_id);

COMMENT ON TABLE campanhasmarketingdigital.demand_radar_cache IS
  'Cache diário do Radar de Demanda por tenant × segmento × cliente.';

-- =====================================================
-- 045_create_analytics_pageviews.sql
-- Tabela de analytics de visitas ao site público
-- Dados anonimizados — conformidade LGPD
-- =====================================================

CREATE TABLE IF NOT EXISTS public.analytics_pageviews (
  id            BIGSERIAL PRIMARY KEY,

  -- Página visitada
  page_path     VARCHAR(2000)   NOT NULL,
  page_title    VARCHAR(500)    NULL,

  -- Classificação da página
  page_type     VARCHAR(50)     NOT NULL DEFAULT 'other',
  -- 'home' | 'imovel' | 'pesquisa' | 'mapa' | 'landpaging' | 'corretor' | 'meu-perfil' | 'other'
  imovel_id     INTEGER         NULL,

  -- Identificação anônima do visitante
  session_id    VARCHAR(64)     NOT NULL,   -- cookie anônimo de 30 dias
  ip_hash       VARCHAR(64)     NULL,        -- SHA-256 do IP — nunca o IP real (LGPD)

  -- Origem do tráfego
  referrer      VARCHAR(2000)   NULL,
  referrer_type VARCHAR(30)     NULL,
  -- 'google' | 'direct' | 'social' | 'other'
  utm_source    VARCHAR(200)    NULL,
  utm_medium    VARCHAR(200)    NULL,
  utm_campaign  VARCHAR(200)    NULL,

  -- Dispositivo
  device_type   VARCHAR(20)     NOT NULL DEFAULT 'unknown',
  -- 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown'
  browser       VARCHAR(100)    NULL,
  os            VARCHAR(100)    NULL,

  -- Temporal
  created_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Índices para performance das queries do dashboard
CREATE INDEX IF NOT EXISTS idx_analytics_pv_created_at    ON public.analytics_pageviews (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_pv_page_type     ON public.analytics_pageviews (page_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_pv_imovel_id     ON public.analytics_pageviews (imovel_id, created_at DESC) WHERE imovel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_pv_session_id    ON public.analytics_pageviews (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_pv_device_type   ON public.analytics_pageviews (device_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_pv_referrer_type ON public.analytics_pageviews (referrer_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_pv_utm_campaign  ON public.analytics_pageviews (utm_campaign, created_at DESC) WHERE utm_campaign IS NOT NULL;

COMMENT ON TABLE public.analytics_pageviews IS
  'Visitas ao site público. Retenção: 12 meses. IP nunca armazenado (LGPD). Session ID anônimo.';

-- Quebras de desempenho por idade+gênero, região e horário (plano PLANO_SEGMENTACAO_E_WIZARD.md).
-- Aditiva e idempotente. Não altera a tabela Insight (que continua com o total).
-- Cada linha = uma quebra de um dia de uma campanha.
--   breakdown_type 'age_gender' → breakdown_key 'faixa|genero'   (ex.: '25-34|female')
--   breakdown_type 'region'     → breakdown_key 'nome da região'  (ex.: 'Pernambuco')
--   breakdown_type 'hour'       → breakdown_key 'hora 0-23'       (ex.: '14')

CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."InsightBreakdown" (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  campaign_id     text NOT NULL REFERENCES campanhasmarketingdigital."Campaign"(id) ON DELETE CASCADE,
  date            date NOT NULL,
  breakdown_type  varchar(20) NOT NULL,
  breakdown_key   varchar(100) NOT NULL,
  impressions     integer NOT NULL DEFAULT 0,
  clicks          integer NOT NULL DEFAULT 0,
  reach           integer NOT NULL DEFAULT 0,
  leads           integer NOT NULL DEFAULT 0,
  spend           numeric(12,2) NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_insight_breakdown_type CHECK (breakdown_type IN ('age_gender', 'region', 'hour')),
  CONSTRAINT uq_insight_breakdown UNIQUE (campaign_id, date, breakdown_type, breakdown_key)
);

CREATE INDEX IF NOT EXISTS idx_insight_breakdown_tenant
  ON campanhasmarketingdigital."InsightBreakdown" (tenant_id, breakdown_type, date);

-- Métricas por ANÚNCIO e por dia (feedback real da Meta sobre cada criativo).
-- Tabela separada de "Insight" de propósito: "Insight" é agregado por campanha e é somado
-- pelos dashboards; gravar linhas por anúncio ali duplicaria os totais.
-- Aditiva e idempotente.
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."AdInsight" (
  id                      TEXT PRIMARY KEY,
  "adId"                  TEXT NOT NULL REFERENCES campanhasmarketingdigital."Ad"(id) ON DELETE CASCADE,
  "campaignId"            TEXT NOT NULL,
  "tenantId"              UUID,
  date                    DATE NOT NULL,
  impressions             INTEGER NOT NULL DEFAULT 0,
  reach                   INTEGER NOT NULL DEFAULT 0,
  clicks                  INTEGER NOT NULL DEFAULT 0,
  spend                   DOUBLE PRECISION NOT NULL DEFAULT 0,
  frequency               DOUBLE PRECISION NOT NULL DEFAULT 0,
  "messagingConversations" INTEGER NOT NULL DEFAULT 0,
  "qualityRanking"        TEXT,
  "engagementRateRanking" TEXT,
  "conversionRateRanking" TEXT,
  "videoViews3s"          INTEGER NOT NULL DEFAULT 0,
  "videoViewsP25"         INTEGER NOT NULL DEFAULT 0,
  "videoViewsP50"         INTEGER NOT NULL DEFAULT 0,
  "videoViewsP75"         INTEGER NOT NULL DEFAULT 0,
  "videoViewsP100"        INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "AdInsight_adId_date_key" UNIQUE ("adId", date)
);
CREATE INDEX IF NOT EXISTS "AdInsight_campaignId_date_idx" ON campanhasmarketingdigital."AdInsight" ("campaignId", date);

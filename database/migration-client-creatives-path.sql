-- Migration: tabela 1:N para Pasta de Criativos por cliente do tenant
-- Executar: docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria < database/migration-client-creatives-path.sql

CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."ClientCreativesPath" (
  id            UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id     UUID        NOT NULL,
  client_id     UUID        NOT NULL,
  creatives_path TEXT       NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_client_creatives UNIQUE (tenant_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_ccp_tenant
  ON campanhasmarketingdigital."ClientCreativesPath"(tenant_id);

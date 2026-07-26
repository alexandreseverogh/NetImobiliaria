-- Google Lead Form Webhook — tabela de dedupe idempotente.
-- O Google não garante entrega exatamente-uma-vez do lead_id (ver
-- https://developers.google.com/google-ads/webhook/docs/implementation), então usamos lead_id
-- como PK: um INSERT com ON CONFLICT DO NOTHING detecta reentrega sem duplicar o lead no CRM.
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."GoogleLeadFormSubmission" (
  id           TEXT PRIMARY KEY,           -- lead_id do Google (garante idempotência)
  tenant_id    UUID NOT NULL,
  campaign_id  TEXT,                       -- FK lógica pra Campaign.id (não física — cross-schema)
  lead_uuid    UUID,                       -- preenchido após criar o lead em public.leads_staging
  is_test      BOOLEAN NOT NULL DEFAULT false,
  raw_payload  JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_google_lead_form_submission_tenant
  ON campanhasmarketingdigital."GoogleLeadFormSubmission" (tenant_id, created_at DESC);

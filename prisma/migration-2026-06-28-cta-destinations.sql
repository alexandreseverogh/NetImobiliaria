-- ============================================================================
-- MIGRATION: CTA Destinations + Lead Capture (Mecanismo A — form hospedado pelo app)
-- Data: 2026-06-28
-- Schema: campanhasmarketingdigital (marketing) + vínculo com public.leads_staging (CRM)
-- APLICAR VIA psql — NUNCA `prisma db push` (derruba tabelas de produção)
--   psql -h localhost -p 15432 -U postgres -d net_imobiliaria -f prisma/migration-2026-06-28-cta-destinations.sql
--
-- Responde:
--   #1 Registro estruturado de destinos por tenant/cliente (substitui URL solta)
--   #2 Armazenamento universal de interações + submissões (base analítica)
--   #3 Vínculo da submissão ao lead criado em public.leads_staging (CRM)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 1) Registro de destinos de CTA (por tenant / cliente)
--    type: APP_FORM (form hospedado pelo app) | EXTERNAL_URL | WHATSAPP
--    config (jsonb):
--      APP_FORM     → { title, description, submitLabel, thankYouMessage,
--                       redirectUrl?, fields: [{ name, label, type, required, options? }] }
--      WHATSAPP     → { phoneNumber, introMessage }
--      EXTERNAL_URL → { url }
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."CtaDestination" (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  client_id    uuid,
  name         text NOT NULL,
  slug         text NOT NULL,                       -- usado na URL pública /l/{slug}
  type         text NOT NULL DEFAULT 'APP_FORM',    -- APP_FORM | EXTERNAL_URL | WHATSAPP
  cta_type     text,                                -- LEARN_MORE, SHOP_NOW, SIGN_UP, ... (rótulo do CTA)
  config       jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cta_destination_slug
  ON campanhasmarketingdigital."CtaDestination" (slug);
CREATE INDEX IF NOT EXISTS idx_cta_destination_tenant
  ON campanhasmarketingdigital."CtaDestination" (tenant_id, client_id, is_active);

-- ----------------------------------------------------------------------------
-- 2) Log de interações — base analítica (todo clique / abertura / submit)
--    event_type: VIEW | SUBMIT | WHATSAPP_CLICK | REDIRECT
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."CtaInteraction" (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  client_id      uuid,
  destination_id uuid,
  campaign_id    text,
  ad_id          text,
  cta_type       text,
  event_type     text NOT NULL DEFAULT 'VIEW',
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,
  ip_address     text,
  user_agent     text,
  referrer       text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cta_interaction_tenant
  ON campanhasmarketingdigital."CtaInteraction" (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cta_interaction_dest
  ON campanhasmarketingdigital."CtaInteraction" (destination_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cta_interaction_campaign
  ON campanhasmarketingdigital."CtaInteraction" (campaign_id);

-- ----------------------------------------------------------------------------
-- 3) Submissões de formulário (payload completo + campos normalizados)
--    lead_uuid → vínculo com public.leads_staging (CRM) após geração do lead
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."CtaSubmission" (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      uuid NOT NULL,
  client_id      uuid,
  destination_id uuid,
  interaction_id uuid,
  campaign_id    text,
  cta_type       text,
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb, -- todos os campos preenchidos
  name           text,
  email          text,
  phone          text,
  lead_uuid      uuid,                                -- FK lógica → public.leads_staging.lead_uuid
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cta_submission_tenant
  ON campanhasmarketingdigital."CtaSubmission" (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cta_submission_dest
  ON campanhasmarketingdigital."CtaSubmission" (destination_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cta_submission_lead
  ON campanhasmarketingdigital."CtaSubmission" (lead_uuid);

-- ============================================================================
-- FIM. Nenhuma tabela existente é alterada/derrubada (apenas CREATE IF NOT EXISTS).
-- ============================================================================

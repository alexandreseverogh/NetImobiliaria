-- Correção de arquitetura (seção 10 do plano, 2026-10-28 rodada 3): App da Meta é por TENANT
-- (reaproveita meta_app_id/meta_app_secret já existentes, usados hoje só por Meta Ads), não
-- um App global da plataforma — app_secret/webhook_verify_token nunca deveriam ser por
-- tenant+cliente em mensageria.whatsapp_cloud_credentials.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS whatsapp_embedded_signup_config_id VARCHAR(50),
  ADD COLUMN IF NOT EXISTS whatsapp_webhook_verify_token TEXT;

-- Remove as 2 colunas que nunca deveriam ter sido por tenant+cliente — nada em produção ainda
-- (confirmado pelo usuário), sem necessidade de backfill/preservação de histórico.
ALTER TABLE mensageria.whatsapp_cloud_credentials
  DROP COLUMN IF EXISTS app_secret,
  DROP COLUMN IF EXISTS webhook_verify_token;

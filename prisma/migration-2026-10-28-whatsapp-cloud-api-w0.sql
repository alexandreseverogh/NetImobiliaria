-- Mensageria: suporte a WhatsApp Cloud API oficial (Achado #4, docs/PLANO_WHATSAPP_CLOUD_API_
-- PROVIDER.md) — W0: escolha explícita de provider por tenant/cliente (excludente, seção 5.4b)
-- + armazenamento da credencial Cloud API + contador mensal de uso (seção 2.3/5.1).

-- 1. Escolha explícita de provider — excludente, nunca inferido pelo que está configurado
--    (decisão do usuário 2026-10-28). client_id em public.clientes sempre existe como coluna
--    (tenant_id não é FK composta aqui porque o valor é só um enum de escolha, não um dado
--    vinculado a outra entidade); NULL em clientes = herda do tenant (mesma cascata de sempre).
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS whatsapp_provider VARCHAR(20) NOT NULL DEFAULT 'evolution';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_whatsapp_provider_check'
  ) THEN
    ALTER TABLE public.tenants
      ADD CONSTRAINT tenants_whatsapp_provider_check
      CHECK (whatsapp_provider IN ('evolution', 'whatsapp_cloud'));
  END IF;
END $$;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS whatsapp_provider VARCHAR(20) NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clientes_whatsapp_provider_check'
  ) THEN
    ALTER TABLE public.clientes
      ADD CONSTRAINT clientes_whatsapp_provider_check
      CHECK (whatsapp_provider IS NULL OR whatsapp_provider IN ('evolution', 'whatsapp_cloud'));
  END IF;
END $$;

-- 2. Credencial Cloud API — 1 linha por escopo (tenant-wide quando client_id NULL, por cliente
--    quando setado), mesmo padrão de índice único parcial já usado em labels/canned_responses/
--    knowledge_documents/WhatsAppConfig nesta mesma frente de trabalho.
CREATE TABLE IF NOT EXISTS mensageria.whatsapp_cloud_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id UUID NULL REFERENCES public.clientes(uuid) ON DELETE CASCADE,
  phone_number_id VARCHAR(50) NOT NULL,
  waba_id VARCHAR(50) NOT NULL,
  access_token TEXT NOT NULL,
  app_secret TEXT NOT NULL,
  webhook_verify_token TEXT NOT NULL,
  display_phone_number VARCHAR(20) NULL,
  -- auto-reportado pelo próprio tenant/cliente ("já cadastrei cartão no Business Manager da
  -- Meta") — nunca gate programático de verdade (ver plano seção 2.3); só controla o aviso na UI.
  payment_method_confirmed BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_cloud_credentials_client_same_tenant'
  ) THEN
    ALTER TABLE mensageria.whatsapp_cloud_credentials
      ADD CONSTRAINT whatsapp_cloud_credentials_client_same_tenant
      FOREIGN KEY (tenant_id, client_id)
      REFERENCES public.clientes (tenant_id, uuid)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_cloud_credentials_tenant_client_uq
  ON mensageria.whatsapp_cloud_credentials (
    tenant_id,
    (COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid))
  );

-- Lookup pelo webhook de entrada (W1) — identifica tenant/cliente a partir do
-- metadata.phone_number_id que a Meta manda em todo POST de mensagem recebida.
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_cloud_credentials_phone_number_id_uq
  ON mensageria.whatsapp_cloud_credentials (phone_number_id)
  WHERE is_active = true;

-- 3. Contador mensal por número — só alimenta o aviso de "chegando perto do teto gratuito"
--    (seção 2.3/2.4); nunca é o que decide se a Meta entrega ou não a mensagem.
CREATE TABLE IF NOT EXISTS mensageria.whatsapp_cloud_usage_monthly (
  phone_number_id VARCHAR(50) NOT NULL,
  year_month VARCHAR(7) NOT NULL,
  service_messages_sent INTEGER NOT NULL DEFAULT 0,
  last_alert_threshold INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (phone_number_id, year_month)
);

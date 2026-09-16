-- Tier 3 do plano "Loop do ICP" (2026-09-04) — último item: Lookalike/Custom Audience.
-- Nova tabela, aditiva, schema public (é dado de negócio compartilhado entre Campanhas e o
-- lead real do CRM — mesma convenção de leads_staging/marketing_eventos).
--
-- Escopo v1, deliberado: só rede 'meta' (única com Custom Audience/Lookalike real via API
-- confirmada nesta sessão). Google Ads tem "Customer Match", API bem diferente — fora de
-- escopo, registrado como extensão futura, não implementado às cegas.
--
-- Semente da Custom Audience = todo lead com negócio fechado real (leads_kanban.is_ganho)
-- e email OU telefone preenchido (Opção A, decidida com o usuário — mais robusta que filtrar
-- por fit, que dependeria de quanto tempo a qualificação por IA já está ativa no tenant).

CREATE TABLE IF NOT EXISTS public.tenant_audiences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id             UUID REFERENCES public.clientes(uuid) ON DELETE CASCADE,
  network_code          VARCHAR(20) NOT NULL DEFAULT 'meta',
  kind                  VARCHAR(20) NOT NULL CHECK (kind IN ('custom', 'lookalike')),
  external_id           VARCHAR(100),                  -- id real retornado pela rede; NULL até a chamada suceder
  origin_audience_id    UUID REFERENCES public.tenant_audiences(id) ON DELETE SET NULL, -- só p/ kind='lookalike'
  name                  VARCHAR(255) NOT NULL,
  criteria              JSONB NOT NULL DEFAULT '{}'::jsonb, -- registra o filtro usado (auditoria/rastreabilidade)
  member_count_uploaded INTEGER NOT NULL DEFAULT 0,
  approximate_count     INTEGER,                        -- populado só depois de refreshAudienceStatus (a rede processa assíncrono)
  status                VARCHAR(20) NOT NULL DEFAULT 'CREATING'
                          CHECK (status IN ('CREATING', 'UPLOADING', 'PROCESSING', 'READY', 'FAILED')),
  error_message         TEXT,
  last_synced_at        TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_audiences_tenant ON public.tenant_audiences (tenant_id, client_id);
CREATE INDEX IF NOT EXISTS idx_tenant_audiences_origin ON public.tenant_audiences (origin_audience_id) WHERE origin_audience_id IS NOT NULL;

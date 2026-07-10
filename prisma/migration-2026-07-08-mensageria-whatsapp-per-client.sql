-- Migration: WhatsApp por cliente (PLANO_MENSAGERIA.md seção 14.9)
-- Corrige o gap: resolveWhatsAppInbox() resolvia 1 única inbox por tenant, ignorando client_id.
-- Segue o mesmo padrão já usado para page_id/pixel_id/instagram_actor_id/website em
-- public.clientes (cascata Tenant → Cliente, ver CLAUDE.md "Arquitetura de 3 camadas").
-- 100% idempotente e aditivo — nenhum dado existente é alterado.

BEGIN;

-- 1) Credenciais Evolution por cliente (nullable — cliente sem número próprio usa o do tenant)
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS evolution_api_url TEXT,
  ADD COLUMN IF NOT EXISTS evolution_api_key TEXT,
  ADD COLUMN IF NOT EXISTS evolution_instance TEXT,
  ADD COLUMN IF NOT EXISTS numero_whatsapp TEXT,
  ADD COLUMN IF NOT EXISTS evolution_webhook_secret TEXT;

-- Secret é um token de autenticação do webhook — único globalmente, mesmo padrão de
-- public.tenants.evolution_webhook_secret (usado sem escopo de tenant na query de auth).
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_evolution_webhook_secret
  ON public.clientes (evolution_webhook_secret) WHERE evolution_webhook_secret IS NOT NULL;

-- 2) Permite mais de 1 inbox de WhatsApp por tenant — uma por cliente com número próprio,
-- mais a inbox padrão do tenant (client_id NULL). Sem isso, resolveWhatsAppInbox() sempre
-- parava no primeiro registro que achasse via LIMIT 1, sem diferenciar por cliente.
CREATE UNIQUE INDEX IF NOT EXISTS idx_inboxes_tenant_client_channel
  ON mensageria.inboxes (tenant_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'), channel_type)
  WHERE channel_type = 'whatsapp';

COMMIT;

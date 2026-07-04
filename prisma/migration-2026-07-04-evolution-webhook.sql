-- ============================================================
-- Migration 2026-07-04: Evolution API webhook secret por tenant
-- Cada tenant recebe uma URL única para receber mensagens WA:
--   https://artemis4.com.br/api/public/evolution/webhook?token={secret}
-- ============================================================

BEGIN;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS evolution_webhook_secret text;

-- Gerar segredo único para todos os tenants existentes
UPDATE public.tenants
SET evolution_webhook_secret = gen_random_uuid()::text
WHERE evolution_webhook_secret IS NULL;

COMMIT;

-- FASE 19.2 — Circuit breaker por tenant+rede (blindagem contra mudança de API Meta/Google/TikTok)
-- Aditiva, sem risco a dado existente. Ver docs/CHECKPOINT.md (2026-09-03) e o plano em
-- C:\Users\T-GAMER\.claude\plans\crystalline-riding-squid.md.

ALTER TABLE public.tenant_network_credentials
  ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS circuit_tripped_at TIMESTAMPTZ;

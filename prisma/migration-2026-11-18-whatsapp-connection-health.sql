-- Saúde da conexão de WhatsApp: estado por empresa e disponibilidade por servidor Evolution.
-- Idempotente.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS evolution_state VARCHAR(20) NULL,
  ADD COLUMN IF NOT EXISTS evolution_checked_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS evolution_disconnected_at TIMESTAMPTZ NULL;

ALTER TABLE public.evolution_servers
  ADD COLUMN IF NOT EXISTS last_reachable BOOLEAN NULL,
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ NULL;

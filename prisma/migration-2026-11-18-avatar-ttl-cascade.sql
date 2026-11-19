-- Foto de perfil sob demanda com TTL em cascata: cliente > tenant > segmento.
-- Idempotente. O valor padrão (7 dias) vive no banco (system_segments), nunca no código.

ALTER TABLE public.system_segments
  ADD COLUMN IF NOT EXISTS avatar_ttl_days_default INTEGER NOT NULL DEFAULT 7;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS avatar_ttl_days INTEGER NULL;

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS avatar_ttl_days INTEGER NULL;

ALTER TABLE mensageria.contact_profiles
  ADD COLUMN IF NOT EXISTS avatar_fetched_at TIMESTAMPTZ NULL;

-- Garante o intervalo válido (1 a 365 dias) para os três níveis.
DO $$ BEGIN
  ALTER TABLE public.system_segments ADD CONSTRAINT chk_system_segments_avatar_ttl
    CHECK (avatar_ttl_days_default BETWEEN 1 AND 365);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.tenants ADD CONSTRAINT chk_tenants_avatar_ttl
    CHECK (avatar_ttl_days IS NULL OR avatar_ttl_days BETWEEN 1 AND 365);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.clientes ADD CONSTRAINT chk_clientes_avatar_ttl
    CHECK (avatar_ttl_days IS NULL OR avatar_ttl_days BETWEEN 1 AND 365);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

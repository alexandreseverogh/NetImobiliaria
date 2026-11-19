-- Tempo máximo (ms) para baixar mídia de mensagem @lid sem número. Editável por tenant.
-- Idempotente.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS lid_media_timeout_ms INTEGER NOT NULL DEFAULT 15000;

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS chk_tenants_lid_media_timeout;
ALTER TABLE public.tenants
  ADD CONSTRAINT chk_tenants_lid_media_timeout CHECK (lid_media_timeout_ms BETWEEN 1000 AND 120000);

UPDATE public.tenants SET lid_media_timeout_ms = 15000 WHERE id = 'efbf62cf-9e28-4b31-a4f6-82a037412353';

-- 032_create_email_bounces.sql
-- Armazena e-mails que deram bounce/rejeição para evitar tentativas repetidas (anti-spam).

CREATE TABLE IF NOT EXISTS public.email_bounces (
  id              BIGSERIAL PRIMARY KEY,
  to_email        VARCHAR(255) NOT NULL,
  bounce_count    INTEGER NOT NULL DEFAULT 1,
  last_error      TEXT,
  last_bounced_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_bounces_to_email
  ON public.email_bounces (lower(to_email));

CREATE INDEX IF NOT EXISTS idx_email_bounces_last_bounced_at
  ON public.email_bounces (last_bounced_at DESC);



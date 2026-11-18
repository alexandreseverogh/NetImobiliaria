-- Fila durável de eventos recebidos da Evolution API (WhatsApp).
-- Objetivo: nenhuma mensagem se perde por lentidão, falha ou queda do processamento.
-- O webhook grava o payload bruto aqui e responde 200 imediatamente; um drenador processa
-- com retry e backoff. Idempotente: pode rodar de novo sem efeito colateral.

CREATE TABLE IF NOT EXISTS mensageria.webhook_inbox (
  id              BIGSERIAL PRIMARY KEY,
  tenant_id       UUID NOT NULL,
  owner_client_id UUID NULL,
  dedupe_key      VARCHAR(64) NOT NULL,            -- sha256 do payload: reenvio idêntico não duplica
  payload         JSONB NOT NULL,
  status          VARCHAR(12) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempts        INT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_at       TIMESTAMPTZ NULL,                -- para recuperar linhas presas em 'processing'
  last_error      TEXT NULL,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at    TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_webhook_inbox_dedupe
  ON mensageria.webhook_inbox (tenant_id, dedupe_key);

CREATE INDEX IF NOT EXISTS idx_webhook_inbox_drain
  ON mensageria.webhook_inbox (status, next_attempt_at)
  WHERE status IN ('pending', 'processing');

-- Mensagens de contato @lid sem número real (não resolvidas). Cada identificador vira uma linha.
-- hits conta quantas mensagens chegaram. Idempotente: pode rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS mensageria.lid_unresolved (
  tenant_id     UUID         NOT NULL,
  lid           VARCHAR(64)  NOT NULL,
  push_name     VARCHAR(255),
  last_text     TEXT,
  hits          INTEGER      NOT NULL DEFAULT 1,
  first_seen_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, lid)
);

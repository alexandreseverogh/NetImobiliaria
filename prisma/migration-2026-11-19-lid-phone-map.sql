-- Mapa de identificadores @lid do WhatsApp para o número real (telefone).
-- Motivo: a Evolution às vezes envia mensagens de um contato só com o @lid (sem remoteJidAlt).
-- Sem o número, a mensagem era descartada. Guardamos o par sempre que o evento traz os dois.
-- Idempotente: pode rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS mensageria.lid_phone_map (
  tenant_id   UUID        NOT NULL,
  lid         VARCHAR(64) NOT NULL,
  phone       VARCHAR(32) NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, lid)
);

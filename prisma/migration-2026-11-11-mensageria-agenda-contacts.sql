-- Agenda do celular conectado: número -> nome salvo. Guardada mesmo sem contato existente, para
-- que a primeira mensagem (recebida ou enviada) já saia com o nome da agenda.
CREATE TABLE IF NOT EXISTS mensageria.agenda_contacts (
  tenant_id  UUID NOT NULL,
  phone      TEXT NOT NULL,
  name       TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, phone)
);

-- Índice para achar o contato pelo identificador @lid (contatos sem telefone).
-- Parcial: só contatos que têm lid. Idempotente.
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_lid
  ON mensageria.contacts (tenant_id, (attributes->>'lid'))
  WHERE attributes ? 'lid';

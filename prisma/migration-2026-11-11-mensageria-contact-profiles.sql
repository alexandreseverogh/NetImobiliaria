-- Nome e foto de perfil do WhatsApp por número (o nome vem do que a pessoa cadastrou no WhatsApp).
-- Substitui a antiga tabela agenda_contacts, cujo nome era enganoso.
ALTER TABLE IF EXISTS mensageria.agenda_contacts RENAME TO contact_profiles;
ALTER TABLE mensageria.contact_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE mensageria.contact_profiles ALTER COLUMN name DROP NOT NULL;

ALTER TABLE leads_staging ADD CONSTRAINT unique_email UNIQUE (email);
ALTER TABLE leads_staging ADD CONSTRAINT unique_telefone UNIQUE (telefone);

-- Adicionar coluna valor_ticket_alto
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS valor_ticket_alto NUMERIC(15,2) DEFAULT 2000000.00;

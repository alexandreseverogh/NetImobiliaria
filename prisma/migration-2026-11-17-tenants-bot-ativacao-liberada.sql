-- Parâmetro por tenant, editável só pelo Master: libera (ou não) o Administrador da empresa a
-- ativar o bot da Mensageria (bot_flows.is_active). Padrão: desligado (o bot é liberado caso a caso).
-- Idempotente.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS bot_ativacao_liberada BOOLEAN NOT NULL DEFAULT false;

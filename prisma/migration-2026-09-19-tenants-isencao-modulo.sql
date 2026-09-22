-- Isenção de cobrança por módulo (Stripe Billing) — cada tenant pode ser
-- marcado como isento do pagamento de um módulo específico sem deixar de
-- ter acesso a ele. Curado pelo Master em /admin/master/tenants (as 2
-- superfícies reais de edição — listagem e página de detalhe, ver
-- CLAUDE.md/CHECKPOINT.md sobre os "dois fluxos de edição de tenant").
--
-- Isso é ortogonal ao mecanismo de cobrança em si (Stripe Subscription/
-- Quote) — a lógica de acesso deve checar primeiro isento_<modulo>=true
-- (bypassa qualquer verificação de pagamento) antes de olhar o status de
-- billing vindo do webhook da Stripe.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS isento_marketingdigital BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS isento_mensageria       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS isento_crm              BOOLEAN NOT NULL DEFAULT false;

-- Infra de cobrança via Stripe (2026-09-19) — decisões tomadas com o usuário
-- antes desta migração:
--   1) Assinatura ÚNICA COMBINADA por tenant, com 1 line-item (Price) por
--      módulo contratado — não uma Subscription separada por módulo.
--   2) Inadimplência de um módulo gera bloqueio SÓ daquele módulo (soft
--      block, o mesmo comportamento visual que "módulo não contratado" já
--      tem hoje) — nunca bloqueia login nem os demais módulos.
--
-- tenant_modules.billing_status é o sinal que SÓ o webhook da Stripe deve
-- escrever (nunca editado manualmente pelo Master) — reflete o estado real
-- de pagamento do line-item daquele módulo dentro da Subscription combinada
-- do tenant. É ORTOGONAL a tenant_modules.is_enabled (o toggle manual do
-- Master, "contratou/não contratou"): billing_status só entra em jogo
-- quando is_enabled já é true — módulo nunca contratado nunca olha
-- billing_status.
--
-- tenants.isento_marketingdigital/isento_mensageria/isento_crm (ver
-- migration-2026-09-19-tenants-isencao-modulo.sql, já aplicada) funcionam
-- como bypass: get_sidebar_menu_for_user() passa a exigir
-- "billing_status <> 'past_due' OU isento_<módulo> = true" para o módulo
-- aparecer — ver migration-2026-09-19-sidebar-billing-gate.sql (próxima
-- desta mesma leva).

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS stripe_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

ALTER TABLE public.tenant_modules
  ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_status VARCHAR(20) NOT NULL DEFAULT 'active';

ALTER TABLE public.tenant_modules
  DROP CONSTRAINT IF EXISTS tenant_modules_billing_status_check;
ALTER TABLE public.tenant_modules
  ADD CONSTRAINT tenant_modules_billing_status_check
  CHECK (billing_status IN ('active', 'past_due', 'canceled', 'trialing'));

-- Índice parcial — só interessa em consulta administrativa futura ("quais
-- tenants estão inadimplentes agora"), nunca no caminho quente da sidebar
-- (que já filtra por tenant_id+module_id via PK).
CREATE INDEX IF NOT EXISTS idx_tenant_modules_billing_status
  ON public.tenant_modules (tenant_id, billing_status)
  WHERE billing_status <> 'active';

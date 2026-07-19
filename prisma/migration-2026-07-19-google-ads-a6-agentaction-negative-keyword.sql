-- FASE 1 (Google Ads) A6 — colunas pra ação ADD_NEGATIVE_KEYWORD em AgentAction.
-- Mesmo padrão já usado por scale_pct/budget_proposed (colunas específicas de 1 tipo de
-- ação, nullable, na mesma tabela genérica — não vale a pena um schema polimórfico aqui).
-- AgentAction é acessada só via raw SQL neste arquivo (nunca via Prisma Client), então essas
-- colunas também não entram no schema.marketing.prisma — segue a convenção já estabelecida.

ALTER TABLE campanhasmarketingdigital."AgentAction"
  ADD COLUMN IF NOT EXISTS negative_term VARCHAR(255),
  ADD COLUMN IF NOT EXISTS negative_match_type VARCHAR(20);

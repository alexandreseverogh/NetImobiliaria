-- ============================================================
-- 209_fix_uniqueness_constraints.sql
-- Refatoração de unicidade para Multi-Tenant (CPF/CNPJ/Email por inquilino)
-- ============================================================

BEGIN;

-- 1. Tabela CLIENTES
-- Remover constraints e índices globais
ALTER TABLE public.clientes DROP CONSTRAINT IF EXISTS unique_clientes_email;
DROP INDEX IF EXISTS idx_clientes_cpf_unique;

-- Criar novos índices/constraints isolados por tenant
CREATE UNIQUE INDEX idx_clientes_cpf_tenant_unique ON public.clientes (tenant_id, cpf);
CREATE UNIQUE INDEX idx_clientes_email_tenant_unique ON public.clientes (tenant_id, email);


-- 2. Tabela PROPRIETARIOS
-- Remover constraints e índices globais
ALTER TABLE public.proprietarios DROP CONSTRAINT IF EXISTS proprietarios_cpf_key;
ALTER TABLE public.proprietarios DROP CONSTRAINT IF EXISTS proprietarios_email_key;
DROP INDEX IF EXISTS idx_proprietarios_cpf_unique;
DROP INDEX IF EXISTS idx_proprietarios_email;

-- Criar novos índices/constraints isolados por tenant
CREATE UNIQUE INDEX idx_proprietarios_cpf_tenant_unique ON public.proprietarios (tenant_id, cpf) WHERE cpf IS NOT NULL;
CREATE UNIQUE INDEX idx_proprietarios_cnpj_tenant_unique ON public.proprietarios (tenant_id, cnpj) WHERE cnpj IS NOT NULL;
CREATE UNIQUE INDEX idx_proprietarios_email_tenant_unique ON public.proprietarios (tenant_id, email);

COMMIT;

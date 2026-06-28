-- ============================================================================
-- SEED + CONSTRAINT: colunas de kanban por tenant (pipeline de leads do CRM)
-- Data: 2026-06-28
-- Schema: public
-- APLICAR VIA psql — NUNCA `prisma db push`
--   psql -h localhost -p 15432 -U postgres -d net_imobiliaria -f prisma/migration-2026-06-28-seed-kanban-por-tenant.sql
--
-- Problema: kanban_colunas tinha UNIQUE(nome) GLOBAL (desenho de colunas únicas
-- para toda a base) + colunas existentes com tenant_id NULL. Isso impedia
-- colunas por tenant e fazia /api/crm/leads falhar (coluna_id NULL).
--
-- Correção (multi-tenant real):
--   1) Troca UNIQUE(nome) → UNIQUE(tenant_id, nome)  [permite o mesmo nome por tenant]
--   2) Semeia as 7 colunas padrão para cada tenant que ainda não tem as suas
-- Idempotente. As colunas-template legadas (tenant_id NULL) ficam inertes.
-- ============================================================================

-- 1) Constraint composta por tenant
ALTER TABLE public.kanban_colunas DROP CONSTRAINT IF EXISTS kanban_colunas_nome_key;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kanban_colunas_tenant_nome_key'
      AND conrelid = 'public.kanban_colunas'::regclass
  ) THEN
    ALTER TABLE public.kanban_colunas
      ADD CONSTRAINT kanban_colunas_tenant_nome_key UNIQUE (tenant_id, nome);
  END IF;
END $$;

-- 2) Seed por tenant (7 colunas padrão; nomes batem com o código, ex.: 'entendimento_dor')
INSERT INTO public.kanban_colunas (nome, titulo_exibicao, ordem, cor, icone, ativa, sla_hours, tenant_id)
SELECT c.nome, c.titulo, c.ordem, c.cor, c.icone, true, c.sla, ten.id
FROM (VALUES
  ('lead_captado',     'Lead Captado',        1, '#94A3B8', 'InboxIcon',                          2),
  ('Em Análise',       'Em Análise',          2, '#F59E0B', 'MagnifyingGlassIcon',                4),
  ('entendimento_dor', 'Entendimento da Dor', 3, '#3B82F6', 'ChatBubbleBottomCenterTextIcon',    24),
  ('visita_agendada',  'Visita Agendada',     4, '#10B981', 'CalendarIcon',                      24),
  ('proposta_enviada', 'Proposta Enviada',    5, '#8B5CF6', 'DocumentTextIcon',                  48),
  ('fechamento',       'Fechamento',          6, '#059669', 'TrophyIcon',                        24),
  ('perdido',          'Perdido',             7, '#EF4444', 'XCircleIcon',                       24)
) AS c(nome, titulo, ordem, cor, icone, sla)
CROSS JOIN public.tenants ten
WHERE NOT EXISTS (
  SELECT 1 FROM public.kanban_colunas k WHERE k.tenant_id = ten.id
);

-- ============================================================================
-- FIM.
-- ============================================================================

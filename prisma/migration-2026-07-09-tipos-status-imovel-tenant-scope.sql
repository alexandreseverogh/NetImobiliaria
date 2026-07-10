-- ============================================================
-- Migration 2026-07-09: tipos_imovel / status_imovel — escopo real por tenant
--
-- Achado durante o trabalho do bot da Mensageria (M4.2): a rota
-- /api/admin/tipos-imoveis ignorava o tenant do token (bug pré-existente,
-- independente do bot) e SEMPRE lia/gravava sob o tenant "master"
-- (00000000-0000-0000-0000-000000000001). Como consequência, nenhum tenant
-- real tinha catálogo próprio de tipos de imóvel — todos "compartilhavam"
-- (sem saber) as 12 linhas do master.
--
-- A constraint UNIQUE(nome) (global, não por tenant) impedia a correção
-- direta: não dava pra duplicar "Apartamento" pro tenant Marketing Digital
-- enquanto "Apartamento" já existisse sob o master. Corrigido para
-- UNIQUE(tenant_id, nome) — mesmo padrão de tenant_column já usado em
-- outras tabelas da plataforma.
--
-- status_imovel tinha o mesmo problema em menor escala: 11 de 12 linhas já
-- eram por tenant real (Imobiliaria XYZ) — só 1 linha órfã ("Disponível")
-- ainda sob o master.
--
-- amenidades/proximidades NÃO entram aqui — são catálogos genuinamente
-- compartilhados entre tenants (validado: imóveis reais de tenants
-- diferentes já linkam nas mesmas linhas via imovel_amenidades/
-- imovel_proximidades) e não têm o mesmo bug de rota.
-- ============================================================

BEGIN;

-- 1. Constraint de unicidade passa a ser por tenant, não global
-- (drop-then-add é idempotente por construção: IF EXISTS no drop cobre re-execução)
ALTER TABLE public.tipos_imovel DROP CONSTRAINT IF EXISTS tipos_imovel_nome_key;
ALTER TABLE public.tipos_imovel DROP CONSTRAINT IF EXISTS tipos_imovel_tenant_nome_key;
ALTER TABLE public.tipos_imovel ADD CONSTRAINT tipos_imovel_tenant_nome_key UNIQUE (tenant_id, nome);

ALTER TABLE public.status_imovel DROP CONSTRAINT IF EXISTS status_imovel_nome_key;
ALTER TABLE public.status_imovel DROP CONSTRAINT IF EXISTS status_imovel_tenant_nome_key;
ALTER TABLE public.status_imovel ADD CONSTRAINT status_imovel_tenant_nome_key UNIQUE (tenant_id, nome);

-- 2. Duplica o catálogo do master pro tenant Marketing Digital (não move —
--    Imobiliaria XYZ e o próprio master continuam com suas linhas intactas)
INSERT INTO public.tipos_imovel (nome, descricao, ativo, tenant_id)
SELECT nome, descricao, ativo, 'efbf62cf-9e28-4b31-a4f6-82a037412353'
  FROM public.tipos_imovel
 WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, nome) DO NOTHING;

INSERT INTO public.status_imovel (nome, cor, descricao, ativo, consulta_imovel_internauta, tenant_id)
SELECT nome, cor, descricao, ativo, consulta_imovel_internauta, 'efbf62cf-9e28-4b31-a4f6-82a037412353'
  FROM public.status_imovel
 WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, nome) DO NOTHING;

COMMIT;

-- Plantonista: elegibilidade por perfil + autoatendimento (zero hardcode, qualquer segmento)
--
-- Contexto: is_plantonista era um boolean GLOBAL (não por tenant) na tabela users, editável só
-- por um admin, sem nenhum gate de perfil. Corrige 2 problemas: (1) coluna na tabela errada —
-- um usuário pode ter roles diferentes em tenants diferentes, então "é plantonista" precisa ser
-- por vínculo (user_tenant_membership), não global; (2) sem gate de perfil — agora só perfis
-- marcados elegivel_plantonista podem ter membros marcados como plantonista (via autoatendimento,
-- nunca mais um checkbox livre editado por admin).
--
-- As 4 estratégias de distribuição que leem is_plantonista já fazem
-- INNER JOIN public.user_tenant_membership utm ON u.id = utm.user_id com utm.tenant_id = $N —
-- a migração ali é só trocar a coluna de origem, sem JOIN novo.

BEGIN;

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS elegivel_plantonista BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.user_tenant_membership
  ADD COLUMN IF NOT EXISTS is_plantonista BOOLEAN NOT NULL DEFAULT false;

-- Backfill do único usuário real hoje marcado como plantonista (Roberto Severo, tenant CRM
-- SOZINHO, role "Consultor de Vendas") — sem isso, o gate novo quebraria o estado real dele.
UPDATE public.user_tenant_membership
   SET is_plantonista = true
 WHERE user_id = '73ef6f74-a55f-4a20-882f-3de729bf82b6'::uuid
   AND tenant_id = 'c3fc15b7-7033-4e13-8e24-951c2e087dfb'::uuid;

UPDATE public.user_roles
   SET elegivel_plantonista = true
 WHERE id = 56; -- "Consultor de Vendas", tenant CRM SOZINHO

-- Backfill genérico de segurança (idempotente, cobre qualquer outra linha marcada true em
-- `users` que a query manual acima não tenha capturado) — só copia pra vínculos já existentes,
-- nunca cria vínculo novo.
UPDATE public.user_tenant_membership utm
   SET is_plantonista = true
  FROM public.users u
 WHERE utm.user_id = u.id
   AND u.is_plantonista = true
   AND utm.is_plantonista = false;

-- Coluna antiga removida — sem shim de compatibilidade (disciplina do projeto: nunca deixar
-- campo morto/duplicado quando dá pra só mudar o código). Todo o dado real já foi migrado acima.
ALTER TABLE public.users DROP COLUMN is_plantonista;

COMMIT;

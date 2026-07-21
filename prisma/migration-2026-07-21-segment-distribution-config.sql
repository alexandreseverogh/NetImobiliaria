-- F7 de docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md (§6) — extrai o acoplamento a "imóvel" do
-- DistributionEngine para um adaptador de domínio dirigido por dado, sem tabela nova.
--
-- Antes: DistributionEngine tinha 'Corretor' (nome de role) hardcoded em 2 queries, e
-- /api/crm/leads sempre olhava "imoveis.corretor_fk" pra achar o dono do ativo (Nível 1 de
-- roteamento), com domain_id=1 fixo. Um segmento novo (Saúde, Carros) nunca conseguiria
-- roteamento por "dono do ativo" sem código novo.
--
-- Agora: 3 colunas dirigem o roteamento por segmento — o Master configura pela tela de
-- Segmentos (sem SQL, sem deploy). Sem essas colunas preenchidas (segmento novo, ainda não
-- configurado), o Nível 1 (dono do ativo) é pulado graciosamente — cai pro roteamento
-- geográfico (Nível 2/3), que já era 100% agnóstico de domínio.

ALTER TABLE public.system_segments
  ADD COLUMN IF NOT EXISTS distribution_role_name VARCHAR(50) NOT NULL DEFAULT 'Corretor',
  ADD COLUMN IF NOT EXISTS distribution_target_table VARCHAR(63),
  ADD COLUMN IF NOT EXISTS distribution_target_id_column VARCHAR(63),
  ADD COLUMN IF NOT EXISTS distribution_owner_column VARCHAR(63);

-- Backfill do segmento Imobiliário com o comportamento EXATO de hoje (zero regressão):
-- Nível 1 do DistributionEngine já lia "imoveis.corretor_fk" via imovel_id.
UPDATE public.system_segments
   SET distribution_target_table = 'imoveis',
       distribution_target_id_column = 'id',
       distribution_owner_column = 'corretor_fk'
 WHERE slug = 'imobiliaria';

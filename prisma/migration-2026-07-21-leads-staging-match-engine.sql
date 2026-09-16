-- F4 de docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md (§6) — Match Engine real.
--
-- Bug real confirmado nos dados de produção antes desta migração: a MESMA pessoa
-- (alexandreseverog@gmail.com) tem 2 linhas em leads_staging porque o telefone foi
-- gravado em formatos diferentes por canais diferentes ("(81) 99800-0047" vs
-- "+5581998000047") — o match por telefone em /api/crm/leads comparava string exata,
-- então nunca batia entre formatos. match_method registra COMO o match aconteceu
-- (auditoria/rastreabilidade — I1 do plano de testes), e o índice funcional viabiliza
-- comparar telefones normalizados (só dígitos, últimos 10) com performance de índice.

ALTER TABLE public.leads_staging
  ADD COLUMN IF NOT EXISTS match_method VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_leads_staging_telefone_normalizado
  ON public.leads_staging (tenant_id, (RIGHT(regexp_replace(telefone, '\D', '', 'g'), 10)))
  WHERE telefone IS NOT NULL;

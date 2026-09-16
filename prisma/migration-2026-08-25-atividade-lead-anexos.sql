-- Atividades do CRM: múltiplos anexos por atividade (antes só 1, colunas soltas em
-- atividades_lead). Pedido do usuário: na edição, um anexo já existente não aparecia (nenhuma
-- UI mostrava o que já tinha sido anexado antes) e não dava pra anexar mais de um por atividade
-- — o schema antigo só tinha espaço físico pra 1 (anexo_url/anexo_tipo/anexo_nome_original/
-- anexo_tamanho_bytes direto em atividades_lead, sem tabela de histórico).
--
-- Só 2 arquivos no código inteiro liam essas 4 colunas (route.ts + AtividadesLead.tsx),
-- confirmado via grep antes de migrar — ambos reescritos na mesma leva desta migração.

BEGIN;

CREATE TABLE IF NOT EXISTS public.atividade_lead_anexos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id   UUID NOT NULL REFERENCES public.atividades_lead(id) ON DELETE CASCADE,
  tenant_id      UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- s3_key pode ficar NULL em anexos legados cuja key não deu pra derivar da URL no backfill
  -- (só afeta a limpeza no storage ao excluir; a linha em si e a URL sempre funcionam).
  s3_key         TEXT,
  url            TEXT NOT NULL,
  tipo           VARCHAR(10) NOT NULL CHECK (tipo IN ('audio', 'imagem', 'pdf')),
  nome_original  VARCHAR(255) NOT NULL,
  tamanho_bytes  INTEGER NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atividade_lead_anexos_atividade
  ON public.atividade_lead_anexos (atividade_id, created_at);

CREATE INDEX IF NOT EXISTS idx_atividade_lead_anexos_tenant
  ON public.atividade_lead_anexos (tenant_id);

-- Backfill: migra o(s) anexo(s) único(s) já existente(s) nas colunas legadas pra 1 linha cada
-- na tabela nova. s3_key derivado do segmento estável "atividades/..." do path (o mesmo usado
-- pelo upload, `atividades/${tenantId}/${leadUuid}/${uuid}.ext`) — funciona independente de
-- CDN_URL/S3_ENDPOINT terem valor diferente entre dev e produção.
INSERT INTO public.atividade_lead_anexos
  (atividade_id, tenant_id, s3_key, url, tipo, nome_original, tamanho_bytes, created_at)
SELECT
  id,
  tenant_id,
  CASE WHEN anexo_url ~ '/atividades/' THEN substring(anexo_url FROM '(atividades/.*)$') ELSE NULL END,
  anexo_url,
  anexo_tipo,
  anexo_nome_original,
  COALESCE(anexo_tamanho_bytes, 0),
  created_at
FROM public.atividades_lead
WHERE anexo_url IS NOT NULL;

ALTER TABLE public.atividades_lead
  DROP COLUMN IF EXISTS anexo_url,
  DROP COLUMN IF EXISTS anexo_tipo,
  DROP COLUMN IF EXISTS anexo_nome_original,
  DROP COLUMN IF EXISTS anexo_tamanho_bytes;

COMMIT;

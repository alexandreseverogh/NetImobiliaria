-- Linha do tempo de relacionamento do lead (decisão 2026-11-10, ver docs/CHECKPOINT.md).
-- Guarda REFERÊNCIAS a eventos de cada módulo, nunca o conteúdo. A ficha do lead lê esta
-- tabela e busca o detalhe na fonte correta (mensageria.messages para mensagens,
-- atividades_lead para atividades). Assim não duplica dado entre CRM e Mensageria.
--
-- Nada hardcoded: tipo_origem é um código de sistema pequeno e estável (não é catálogo de
-- negócio). O catálogo de atividades de negócio continua em tipos_atividade, por tenant.

CREATE TABLE IF NOT EXISTS public.lead_timeline (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL,
  lead_uuid    UUID NOT NULL,
  tipo_origem  VARCHAR(30) NOT NULL,   -- 'mensageria_message' | 'atividade'
  origem_id    TEXT NOT NULL,          -- id do registro na fonte (uuid como texto)
  occurred_at  TIMESTAMPTZ NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lead_timeline_tipo_origem_valores
    CHECK (tipo_origem IN ('mensageria_message', 'atividade')),
  CONSTRAINT lead_timeline_unica_referencia
    UNIQUE (tipo_origem, origem_id)     -- idempotência: mesma mensagem nunca entra duas vezes
);

CREATE INDEX IF NOT EXISTS idx_lead_timeline_lead
  ON public.lead_timeline (tenant_id, lead_uuid, occurred_at DESC);

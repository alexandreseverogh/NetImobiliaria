-- 023_prospect_routing_and_plantonista.sql
-- Lead Router (MVP site): atribuição de prospects (imovel_prospects) para corretores + SLA de aceite
-- e flag de corretor plantonista para fallback quando não houver área correspondente.
-- Idempotente: seguro para rodar em qualquer ambiente/container.

-- 1) Flag plantonista no usuário
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_plantonista BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_is_plantonista
  ON public.users (is_plantonista);

-- 2) Tabela de atribuições de prospects para corretores (com SLA de aceite embutido)
CREATE TABLE IF NOT EXISTS public.imovel_prospect_atribuicoes (
  id            BIGSERIAL PRIMARY KEY,
  prospect_id   INTEGER NOT NULL,
  corretor_fk   UUID NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'atribuido', -- atribuido|aceito|expirado|transbordado|cancelado|fechado
  motivo        JSONB,
  created_at    TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_em     TIMESTAMP WITHOUT TIME ZONE,
  aceito_em     TIMESTAMP WITHOUT TIME ZONE,
  atualizado_em TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_imovel_prospect_atribuicoes_prospect_id'
  ) THEN
    ALTER TABLE public.imovel_prospect_atribuicoes
      ADD CONSTRAINT fk_imovel_prospect_atribuicoes_prospect_id
      FOREIGN KEY (prospect_id)
      REFERENCES public.imovel_prospects(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_imovel_prospect_atribuicoes_corretor_fk'
  ) THEN
    ALTER TABLE public.imovel_prospect_atribuicoes
      ADD CONSTRAINT fk_imovel_prospect_atribuicoes_corretor_fk
      FOREIGN KEY (corretor_fk)
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;

  -- Uma atribuição ativa por prospect (evita duplicidade)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_imovel_prospect_atribuicoes_prospect_id'
  ) THEN
    ALTER TABLE public.imovel_prospect_atribuicoes
      ADD CONSTRAINT uq_imovel_prospect_atribuicoes_prospect_id
      UNIQUE (prospect_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_imovel_prospect_atribuicoes_corretor_status
  ON public.imovel_prospect_atribuicoes (corretor_fk, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_imovel_prospect_atribuicoes_expira
  ON public.imovel_prospect_atribuicoes (status, expira_em);

-- Trigger de atualizado_em (se a função já existir, como no projeto)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    CREATE OR REPLACE TRIGGER update_imovel_prospect_atribuicoes_atualizado_em
      BEFORE UPDATE ON public.imovel_prospect_atribuicoes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;



-- 033_create_financiamento_patrocinadores.sql
-- Tabela própria para patrocinadores de financiamento (exibição de brands na landpaging).
-- Campos mínimos: logo HD, headline e valor mensal pago.
-- Observação: sem regras voláteis (taxas, percentuais etc) para evitar descrédito.

CREATE TABLE IF NOT EXISTS public.financiamento_patrocinadores (
  id              BIGSERIAL PRIMARY KEY,
  nome            TEXT NOT NULL,
  logo            BYTEA NOT NULL,
  logo_tipo_mime  TEXT NOT NULL,
  headline        TEXT NOT NULL,
  valor_mensal    NUMERIC(12,2) NOT NULL CHECK (valor_mensal >= 0),
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice para seleção eficiente dos "top 8" por valor_mensal
CREATE INDEX IF NOT EXISTS idx_financiamento_patrocinadores_ativo_valor
  ON public.financiamento_patrocinadores (ativo, valor_mensal DESC, id DESC);

-- Trigger padrão do projeto (se existir) para manter updated_at atualizado automaticamente
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_trigger
      WHERE tgname = 'update_financiamento_patrocinadores_updated_at'
    ) THEN
      CREATE TRIGGER update_financiamento_patrocinadores_updated_at
      BEFORE UPDATE ON public.financiamento_patrocinadores
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    END IF;
  END IF;
END $$;


